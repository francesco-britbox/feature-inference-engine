/**
 * QueueService
 * Database-backed persistent queue for zero data loss
 * Single Responsibility: Job queue management
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { processingJobs, documents } from '@/lib/db/schema';
import { QueueError } from '@/lib/utils/errors';
import type { JobType, QueueOptions } from '@/lib/types/queue';
import { activityLogService } from './ActivityLogService';

/**
 * Default queue options from environment
 */
const DEFAULT_OPTIONS: QueueOptions = {
  concurrencyLimit: 3,
  timeout: parseInt(process.env.EXTRACTION_TIMEOUT_MS || '60000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
};

export class QueueService {
  private processing = new Set<string>();
  private options: QueueOptions;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Create a new processing job
   * @param documentId Document UUID
   * @param jobType Type of job (extract, embed, infer)
   * @returns Job ID
   */
  async createJob(documentId: string, jobType: JobType = 'extract'): Promise<string> {
    try {
      const [job] = await db
        .insert(processingJobs)
        .values({
          documentId,
          jobType,
          status: 'pending',
          maxRetries: this.options.maxRetries,
        })
        .returning();

      if (!job) {
        throw new QueueError('Failed to create processing job');
      }

      // Log job queued
      activityLogService.addLog('info', `📋 Queued for processing`, { documentId, jobId: job.id });

      return job.id;
    } catch (error) {
      throw new QueueError(
        `Failed to create job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Process next pending job using atomic claim.
   * Uses FOR UPDATE SKIP LOCKED to prevent race conditions
   * when multiple workers try to claim the same job.
   *
   * @param processor Function to process the job
   * @returns Job ID if processed, null if no jobs available
   */
  async processNext(
    processor: (documentId: string, jobId: string) => Promise<void>
  ): Promise<string | null> {
    // Check concurrency limit
    if (this.processing.size >= this.options.concurrencyLimit) {
      return null;
    }

    // Atomically claim the oldest pending job using FOR UPDATE SKIP LOCKED.
    // This ensures no two concurrent calls can claim the same job.
    const claimedRows = await db.execute(sql`
      UPDATE processing_jobs
      SET status = 'processing', started_at = NOW()
      WHERE id = (
        SELECT id FROM processing_jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, document_id
    `);

    const claimed = claimedRows.rows as Array<{ id: string; document_id: string }>;
    if (claimed.length === 0) {
      return null; // No pending jobs
    }

    const jobId = claimed[0]!.id;
    const documentId = claimed[0]!.document_id;

    // Track in-memory for concurrency limit
    this.processing.add(jobId);

    try {
      // Update document status
      await db
        .update(documents)
        .set({ status: 'processing' })
        .where(eq(documents.id, documentId));

      // Execute processor with timeout
      await this.executeWithTimeout(
        () => processor(documentId, jobId),
        this.options.timeout
      );

      // Mark as completed
      await db
        .update(processingJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, jobId));

      // Update document status
      await db
        .update(documents)
        .set({
          status: 'completed',
          processedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      return jobId;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Log timeout or error
      if (errorMsg.includes('timeout')) {
        const [jobData] = await db.select().from(processingJobs).where(eq(processingJobs.id, jobId));
        const retryNum = (jobData?.retryCount || 0) + 1;
        activityLogService.addLog(
          'warning',
          `⏱️ Timeout after ${this.options.timeout / 1000}s (attempt ${retryNum} of ${this.options.maxRetries})`,
          { documentId, jobId }
        );
      }

      await this.handleJobFailure(jobId, documentId, error as Error);
      return jobId;
    } finally {
      this.processing.delete(jobId);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Extraction timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(
    jobId: string,
    documentId: string,
    error: Error
  ): Promise<void> {
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.id, jobId));

    if (!job) return;

    const shouldRetry = job.retryCount < job.maxRetries;

    if (shouldRetry) {
      // Increment retry count and reset to pending
      await db
        .update(processingJobs)
        .set({
          status: 'pending',
          retryCount: job.retryCount + 1,
          errorMessage: error.message,
        })
        .where(eq(processingJobs.id, jobId));

      // Reset document status
      await db
        .update(documents)
        .set({ status: 'uploaded' })
        .where(eq(documents.id, documentId));

      // Log retry
      activityLogService.addLog(
        'warning',
        `🔄 Retrying (attempt ${job.retryCount + 2} of ${job.maxRetries + 1})`,
        { documentId, jobId }
      );
    } else {
      // Max retries exceeded, mark as failed
      await db
        .update(processingJobs)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message,
        })
        .where(eq(processingJobs.id, jobId));

      // Mark document as failed
      await db
        .update(documents)
        .set({
          status: 'failed',
          errorMessage: error.message,
        })
        .where(eq(documents.id, documentId));
    }
  }

  /**
   * Resume pending and processing jobs on startup
   */
  async resumeJobs(): Promise<number> {
    // Reset any jobs stuck in processing status
    const result = await db
      .update(processingJobs)
      .set({ status: 'pending' })
      .where(eq(processingJobs.status, 'processing'))
      .returning();

    return result.length;
  }

  /**
   * Get number of jobs by status
   */
  async getJobCounts(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const jobs = await db.select().from(processingJobs);

    return {
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
    };
  }
}

/**
 * Singleton instance
 */
export const queueService = new QueueService();
