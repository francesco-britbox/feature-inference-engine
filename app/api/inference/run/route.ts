/**
 * Feature Inference API
 * Trigger full inference pipeline
 * POST /api/inference/run
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { evidence } from '@/lib/db/schema';
import { embeddingService } from '@/lib/services/EmbeddingService';
import { clusteringService } from '@/lib/services/ClusteringService';
import { featureInferenceService } from '@/lib/services/FeatureInferenceService';
import { confidenceScorer } from '@/lib/services/ConfidenceScorer';
import { relationshipBuilder } from '@/lib/services/RelationshipBuilder';

/**
 * POST /api/inference/run
 * Run complete inference pipeline: Extract → Embed → Cluster → Infer → Score → Relate
 */
export async function POST(): Promise<NextResponse> {
  try {
    // Step 1: Generate embeddings
    const evidenceItems = await db.select().from(evidence);
    const withoutEmbeddings = evidenceItems.filter((e) => !e.embedding);

    if (withoutEmbeddings.length > 0) {
      const ids = withoutEmbeddings.map((e) => e.id);
      await embeddingService.embedBatch(ids);
    }

    // Step 2: Cluster evidence
    const clusters = await clusteringService.clusterEvidence();

    // Step 3: Generate features from clusters
    let featuresGenerated = 0;
    for (const cluster of clusters) {
      // Use evidence items from cluster (already fetched, no re-query needed)
      const items = cluster.evidenceItems || [];

      if (items.length > 0) {
        await featureInferenceService.generateFeatureFromCluster(items);
        featuresGenerated++;
      }
    }

    // Step 4: Validate and merge duplicates
    const mergedCount = await featureInferenceService.validateAndMergeDuplicates();

    // Step 5: Calculate confidence scores
    const scoredResults = await confidenceScorer.calculateConfidenceForAllFeatures();

    // Step 6: Build relationships
    const relationshipsBuilt = await relationshipBuilder.buildRelationshipsForAllFeatures();

    return NextResponse.json({
      embeddingsGenerated: withoutEmbeddings.length,
      clustersFound: clusters.length,
      featuresGenerated,
      featuresMerged: mergedCount,
      confidenceScored: scoredResults.length,
      relationshipsBuilt,
      message: 'Feature inference complete!',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Inference failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
