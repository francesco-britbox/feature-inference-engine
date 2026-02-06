/**
 * ClusteringService
 * Groups similar evidence using DBSCAN clustering
 * Single Responsibility: Clustering operations only
 */

import DBSCAN from '@cdxoo/dbscan';
import { db } from '@/lib/db/client';
import { evidence } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

/**
 * DBSCAN epsilon parameter (maximum distance between points)
 * Tuned for cosine similarity where distance = 1 - similarity
 * eps=0.3 means points with similarity > 0.7 are considered neighbors
 */
const DBSCAN_EPS = 0.3;

/**
 * DBSCAN minimum samples (minimum cluster size)
 * min_samples=3 means at least 3 evidence items to form a cluster
 */
const DBSCAN_MIN_SAMPLES = 3;

export interface EvidenceCluster {
  clusterId: number;
  evidenceIds: string[];
  size: number;
  evidenceItems?: Array<{ id: string; content: string; type: string }>; // Include evidence data for efficiency
}

export class ClusteringService {
  private readonly log = logger.child({ service: 'ClusteringService' });

  /**
   * Cluster evidence items using DBSCAN algorithm
   * @param documentIds Optional filter by document IDs
   * @returns Array of clusters with evidence IDs
   */
  async clusterEvidence(): Promise<EvidenceCluster[]> {
    try {
      // Fetch evidence with embeddings
      const evidenceItems = await db
        .select()
        .from(evidence);

      // Filter items that have embeddings
      const itemsWithEmbeddings = evidenceItems.filter(
        (item) => item.embedding && Array.isArray(item.embedding)
      );

      if (itemsWithEmbeddings.length === 0) {
        this.log.warn('No evidence items with embeddings found');
        return [];
      }

      this.log.info(
        { count: itemsWithEmbeddings.length },
        'Clustering evidence'
      );

      // Prepare data for DBSCAN
      const embeddings = itemsWithEmbeddings.map((item) => item.embedding as number[]);
      const ids = itemsWithEmbeddings.map((item) => item.id);

      // Run DBSCAN clustering
      const result = DBSCAN({
        dataset: embeddings,
        epsilon: DBSCAN_EPS,
        minimumPoints: DBSCAN_MIN_SAMPLES,
        distanceFunction: (a: number[], b: number[]) => this.cosineDistance(a, b),
      });

      // Group by cluster ID
      const clusterMap = new Map<number, string[]>();

      result.clusters.forEach((cluster, clusterIndex) => {
        const evidenceIdsInCluster = cluster.map((pointIndex) => ids[pointIndex]).filter(Boolean) as string[];

        if (evidenceIdsInCluster.length > 0) {
          clusterMap.set(clusterIndex, evidenceIdsInCluster);
        }
      });

      // Convert to cluster objects with evidence data (avoid re-query)
      const clusters: EvidenceCluster[] = Array.from(clusterMap.entries()).map(
        ([clusterId, evidenceIds]) => {
          // Get evidence items for this cluster
          const clusterItems = itemsWithEmbeddings
            .filter(item => evidenceIds.includes(item.id))
            .map(item => ({
              id: item.id,
              content: item.content,
              type: item.type,
            }));

          return {
            clusterId,
            evidenceIds,
            size: evidenceIds.length,
            evidenceItems: clusterItems,
          };
        }
      );

      // Handle single-item "clusters" (edge case)
      const singleItemClusters = clusters.filter((c) => c.size === 1);
      if (singleItemClusters.length > 0) {
        this.log.info(
          { count: singleItemClusters.length },
          'Single-item clusters detected (may need manual review)'
        );
      }

      this.log.info(
        { clusterCount: clusters.length },
        'Clustering complete'
      );

      return clusters;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Clustering failed'
      );
      throw error;
    }
  }

  /**
   * Cosine distance function for DBSCAN
   * distance = 1 - cosine_similarity
   * @param a Vector A
   * @param b Vector B
   * @returns Distance (0-2, where 0 = identical, 2 = opposite)
   */
  private cosineDistance(a: number[], b: number[]): number {
    const similarity = this.cosineSimilarity(a, b);
    return 1 - similarity;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a Vector A
   * @param b Vector B
   * @returns Similarity (0-1, where 1 = identical)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      const valueA = a[i] || 0;
      const valueB = b[i] || 0;

      dotProduct += valueA * valueB;
      magnitudeA += valueA * valueA;
      magnitudeB += valueB * valueB;
    }

    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }
}

/**
 * Singleton instance
 */
export const clusteringService = new ClusteringService();
