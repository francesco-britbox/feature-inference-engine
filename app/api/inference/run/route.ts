/**
 * Feature Inference API
 * Trigger full inference pipeline
 * POST /api/inference/run
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { evidence } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { embeddingService } from '@/lib/services/EmbeddingService';
import { clusteringService } from '@/lib/services/ClusteringService';
import { featureInferenceService } from '@/lib/services/FeatureInferenceService';
import { confidenceScorer } from '@/lib/services/ConfidenceScorer';
import { relationshipBuilder } from '@/lib/services/RelationshipBuilder';
import { featureHierarchyService } from '@/lib/services/FeatureHierarchyService';

/**
 * Advisory lock key for the inference pipeline.
 * Prevents concurrent pipeline runs from corrupting the database.
 * Uses a constant integer as the lock identifier.
 */
const INFERENCE_PIPELINE_LOCK_KEY = 100001;

/**
 * POST /api/inference/run
 * Run complete inference pipeline: Extract → Embed → Cluster → Infer → Score → Relate
 *
 * Uses a PostgreSQL advisory lock to prevent concurrent runs.
 * Returns 409 if another pipeline run is already in progress.
 */
export async function POST(): Promise<NextResponse> {
  // Attempt to acquire advisory lock (non-blocking)
  const lockQueryResult = await db.execute(
    sql`SELECT pg_try_advisory_lock(${INFERENCE_PIPELINE_LOCK_KEY})`
  );
  const lockRows = lockQueryResult.rows as Array<{ pg_try_advisory_lock: boolean }>;
  const lockAcquired = lockRows[0]?.pg_try_advisory_lock ?? false;

  if (!lockAcquired) {
    return NextResponse.json(
      {
        error: 'Pipeline already running',
        details: 'Another inference pipeline run is in progress. Please wait for it to complete.',
      },
      { status: 409 }
    );
  }

  try {
    // Step 1: Generate embeddings for evidence that doesn't have them yet
    const unembeddedItems = await db
      .select({ id: evidence.id })
      .from(evidence)
      .where(sql`${evidence.embedding} IS NULL`);

    if (unembeddedItems.length > 0) {
      const ids = unembeddedItems.map((e) => e.id);
      await embeddingService.embedBatch(ids);
    }

    // Step 2: Cluster evidence
    const clusters = await clusteringService.clusterEvidence();

    // Step 3: Generate features from clusters
    let featuresGenerated = 0;
    for (const cluster of clusters) {
      const items = cluster.evidenceItems || [];

      if (items.length > 0) {
        await featureInferenceService.generateFeatureFromCluster(items);
        featuresGenerated++;
      }
    }

    // Step 4: Validate and merge duplicates
    const mergedCount = await featureInferenceService.validateAndMergeDuplicates();

    // Step 4.5: Detect hierarchy
    const hierarchyResult = await featureHierarchyService.buildHierarchyForAllFeatures();

    // Step 5: Calculate confidence scores for ALL features (not just candidates)
    // This runs after hierarchy to ensure recently reclassified features are scored.
    const scoredResults = await confidenceScorer.calculateConfidenceForAllFeatures();

    // Step 6: Build relationships
    const relationshipsBuilt = await relationshipBuilder.buildRelationshipsForAllFeatures();

    return NextResponse.json({
      embeddingsGenerated: unembeddedItems.length,
      clustersFound: clusters.length,
      featuresGenerated,
      featuresMerged: mergedCount,
      hierarchyDetected: hierarchyResult,
      confidenceScored: scoredResults.length,
      relationshipsBuilt,
      message: 'Feature inference complete with hierarchy!',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Inference failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    // Always release the advisory lock
    await db.execute(
      sql`SELECT pg_advisory_unlock(${INFERENCE_PIPELINE_LOCK_KEY})`
    );
  }
}
