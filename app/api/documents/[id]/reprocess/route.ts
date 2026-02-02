/**
 * Document Reprocess API Endpoint
 * POST /api/documents/:id/reprocess
 * Trigger incremental reprocessing for a document
 */

import { NextRequest, NextResponse } from 'next/server';
import { changeDetectionService } from '@/lib/services/ChangeDetectionService';
import { IncrementalExtractionService } from '@/lib/services/IncrementalExtractionService';
import { FeatureUpdateService } from '@/lib/services/FeatureUpdateService';
import { extractionService } from '@/lib/services/ExtractionService';
import { FeatureInferenceService } from '@/lib/services/FeatureInferenceService';
import { ConfidenceScorer } from '@/lib/services/ConfidenceScorer';
import { openaiClient } from '@/lib/ai/OpenAIClient';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ endpoint: 'reprocess' });

/**
 * POST /api/documents/:id/reprocess
 * Trigger incremental reprocessing for a document
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: documentId } = await params;

    logger.info({ documentId }, 'Reprocess request received');

    // Validate document ID
    if (!documentId || documentId.trim() === '') {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Check if document needs reprocessing
    const needsReprocessing = await changeDetectionService.needsReprocessing(documentId);

    if (!needsReprocessing) {
      return NextResponse.json(
        {
          message: 'Document does not need reprocessing',
          documentId,
          reprocessed: false,
        },
        { status: 200 }
      );
    }

    // Initialize services with dependency injection
    const incrementalExtractionService = new IncrementalExtractionService(extractionService);
    const featureInferenceService = new FeatureInferenceService(openaiClient);
    const confidenceScorer = new ConfidenceScorer();
    const featureUpdateService = new FeatureUpdateService(
      featureInferenceService,
      confidenceScorer
    );

    // Step 1: Process changed document (extract new evidence, mark old as obsolete)
    const extractionResult = await incrementalExtractionService.processChangedDocument(
      documentId
    );

    logger.info(
      {
        documentId,
        obsoleteCount: extractionResult.obsoleteEvidenceCount,
        newCount: extractionResult.newEvidenceCount,
        affectedFeaturesCount: extractionResult.affectedFeatures.length,
      },
      'Extraction completed'
    );

    // Step 2: Update affected features (recalculate confidence)
    const updateNotification = await featureUpdateService.updateAffectedFeatures(
      extractionResult.affectedFeatures
    );

    logger.info(
      {
        documentId,
        updatedFeatures: updateNotification.totalFeatures,
        statusChanges: updateNotification.statusChanges,
      },
      'Feature updates completed'
    );

    // Step 3: Infer new features from new evidence (optional)
    const newFeatureIds = await featureUpdateService.inferFeaturesFromNewEvidence(documentId);

    logger.info(
      { documentId, newFeatures: newFeatureIds.length },
      'New features inferred'
    );

    // Step 4: Merge new features with existing
    const mergeCount = await featureUpdateService.mergeNewWithExistingFeatures();

    logger.info({ documentId, mergeCount }, 'Features merged');

    // Step 5: Increment document version
    const newVersion = await changeDetectionService.incrementVersion(documentId);

    logger.info({ documentId, newVersion }, 'Document version incremented');

    // Step 6: Log notification
    const finalNotification = {
      ...updateNotification,
      newFeatures: newFeatureIds.length,
    };

    featureUpdateService.logChangeNotification(finalNotification);

    // Return response
    return NextResponse.json(
      {
        message: 'Document reprocessed successfully',
        documentId,
        version: newVersion,
        obsoleteEvidenceCount: extractionResult.obsoleteEvidenceCount,
        newEvidenceCount: extractionResult.newEvidenceCount,
        affectedFeatures: extractionResult.affectedFeatures.length,
        updatedFeatures: updateNotification.totalFeatures,
        newFeatures: newFeatureIds.length,
        mergedFeatures: mergeCount,
        statusChanges: updateNotification.statusChanges,
        reprocessed: true,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Reprocess request failed'
    );

    return NextResponse.json(
      {
        error: 'Failed to reprocess document',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
