/**
 * Stats Service
 * Business logic for system statistics
 */

import { db } from '@/lib/db/client';
import { documents, evidence, features, processingJobs } from '@/lib/db/schema';

export interface SystemStats {
  documents: {
    total: number;
    byStatus: {
      uploaded: number;
      processing: number;
      completed: number;
      failed: number;
    };
  };
  evidence: {
    total: number;
    byType: Record<string, number>;
  };
  features: {
    total: number;
    byStatus: {
      candidate: number;
      confirmed: number;
      rejected: number;
    };
    avgConfidence: number;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
}

/**
 * StatsService
 * Single Responsibility: Fetch and aggregate system statistics
 */
export class StatsService {
  /**
   * Fetches comprehensive system statistics
   * @returns System-wide statistics
   */
  async getSystemStats(): Promise<SystemStats> {
    const [docStats, evidenceStats, featureStats, queueStats] = await Promise.all([
      this.getDocumentStats(),
      this.getEvidenceStats(),
      this.getFeatureStats(),
      this.getQueueStats(),
    ]);

    return {
      documents: docStats,
      evidence: evidenceStats,
      features: featureStats,
      queue: queueStats,
    };
  }

  /**
   * Fetches document statistics
   * @private
   */
  private async getDocumentStats(): Promise<SystemStats['documents']> {
    const allDocuments = await db.select().from(documents);

    return {
      total: allDocuments.length,
      byStatus: {
        uploaded: allDocuments.filter((d) => d.status === 'uploaded').length,
        processing: allDocuments.filter((d) => d.status === 'processing').length,
        completed: allDocuments.filter((d) => d.status === 'completed').length,
        failed: allDocuments.filter((d) => d.status === 'failed').length,
      },
    };
  }

  /**
   * Fetches evidence statistics
   * @private
   */
  private async getEvidenceStats(): Promise<SystemStats['evidence']> {
    const allEvidence = await db.select().from(evidence);

    const byType: Record<string, number> = {};
    allEvidence.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    return {
      total: allEvidence.length,
      byType,
    };
  }

  /**
   * Fetches feature statistics
   * @private
   */
  private async getFeatureStats(): Promise<SystemStats['features']> {
    const allFeatures = await db.select().from(features);

    const avgConfidence =
      allFeatures.length > 0
        ? allFeatures.reduce((sum, f) => sum + parseFloat(f.confidenceScore || '0'), 0) /
          allFeatures.length
        : 0;

    return {
      total: allFeatures.length,
      byStatus: {
        candidate: allFeatures.filter((f) => f.status === 'candidate').length,
        confirmed: allFeatures.filter((f) => f.status === 'confirmed').length,
        rejected: allFeatures.filter((f) => f.status === 'rejected').length,
      },
      avgConfidence,
    };
  }

  /**
   * Fetches queue statistics
   * @private
   */
  private async getQueueStats(): Promise<SystemStats['queue']> {
    const allJobs = await db.select().from(processingJobs);

    return {
      pending: allJobs.filter((j) => j.status === 'pending').length,
      processing: allJobs.filter((j) => j.status === 'processing').length,
      failed: allJobs.filter((j) => j.status === 'failed').length,
    };
  }
}
