/**
 * ClusteringService
 * Groups similar evidence using DBSCAN clustering
 * Single Responsibility: Clustering operations only
 */

import DBSCAN from '@cdxoo/dbscan';
import { db } from '@/lib/db/client';
import { evidence } from '@/lib/db/schema';
import { isNotNull } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { cosineDistance } from '@/lib/utils/vectorMath';

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
      // Fetch only the columns needed for clustering.
      // Filter at the DB level to only rows with embeddings (avoids loading rows we'd discard).
      const itemsWithEmbeddings = await db
        .select({
          id: evidence.id,
          content: evidence.content,
          type: evidence.type,
          embedding: evidence.embedding,
        })
        .from(evidence)
        .where(isNotNull(evidence.embedding));

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
        distanceFunction: (a: number[], b: number[]) => cosineDistance(a, b),
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

}

/**
 * Singleton instance
 */
export const clusteringService = new ClusteringService();
