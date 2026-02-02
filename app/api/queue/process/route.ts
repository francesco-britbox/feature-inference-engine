/**
 * Queue Processing API
 * Manually trigger queue processing
 * POST /api/queue/process
 */

import { NextResponse } from 'next/server';
import { queueService } from '@/lib/services/QueueService';
import { extractionService } from '@/lib/services/ExtractionService';

/**
 * POST /api/queue/process
 * Process pending jobs in the queue
 */
export async function POST(): Promise<NextResponse> {
  try {
    let processed = 0;
    const maxJobs = 10; // Process up to 10 jobs per request

    for (let i = 0; i < maxJobs; i++) {
      const jobId = await queueService.processNext(async (documentId) => {
        await extractionService.extractFromDocument(documentId);
      });

      if (!jobId) {
        break; // No more jobs to process
      }

      processed++;
    }

    return NextResponse.json({
      processed,
      message: `Processed ${processed} jobs`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Queue processing failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
