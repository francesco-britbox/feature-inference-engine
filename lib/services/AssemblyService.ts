/**
 * Assembly Service
 * Single Responsibility: Collect and group evidence for a feature
 * Follows SRP - only handles evidence aggregation, no generation logic
 */

import { db } from '@/lib/db/client';
import { evidence, featureEvidence } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { GroupedEvidence } from '@/lib/types/output';
import type { EvidenceType } from '@/lib/types/evidence';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'AssemblyService' });

/**
 * Evidence item with metadata
 */
interface EvidenceItem {
  id: string;
  type: EvidenceType;
  content: string;
  rawData?: Record<string, unknown>;
}

/**
 * Assembly Service
 * Collects all evidence for a feature and groups by type
 */
export class AssemblyService {
  /**
   * Collect all evidence linked to a feature
   * @param featureId Feature UUID
   * @returns Grouped evidence by type
   */
  async collectEvidenceForFeature(featureId: string): Promise<GroupedEvidence> {
    logger.info({ featureId }, 'Collecting evidence for feature');

    if (!featureId) {
      throw new InvalidDataError('Feature ID is required', 'featureId');
    }

    try {
      // Query all evidence linked to this feature
      const evidenceList = await db
        .select({
          id: evidence.id,
          type: evidence.type,
          content: evidence.content,
          rawData: evidence.rawData,
        })
        .from(evidence)
        .innerJoin(featureEvidence, eq(featureEvidence.evidenceId, evidence.id))
        .where(eq(featureEvidence.featureId, featureId));

      logger.info(
        { featureId, evidenceCount: evidenceList.length },
        'Evidence collected'
      );

      // Group evidence by type
      const grouped = this.groupEvidenceByType(evidenceList as EvidenceItem[]);

      return grouped;
    } catch (error) {
      logger.error(
        { featureId, error: error instanceof Error ? error.message : String(error) },
        'Failed to collect evidence'
      );
      throw error;
    }
  }

  /**
   * Group evidence by type
   * @param evidenceList List of evidence items
   * @returns Evidence grouped by type
   */
  private groupEvidenceByType(evidenceList: EvidenceItem[]): GroupedEvidence {
    const grouped: GroupedEvidence = {
      endpoint: [],
      payload: [],
      requirement: [],
      edge_case: [],
      acceptance_criteria: [],
      ui_element: [],
      flow: [],
      bug: [],
      constraint: [],
    };

    for (const item of evidenceList) {
      const { id, type, content, rawData } = item;

      // Use type as key directly (Open/Closed Principle - no modification needed for new types)
      if (type in grouped) {
        grouped[type].push({ id, content, rawData: rawData as Record<string, unknown> });
      } else {
        logger.warn({ type }, 'Unknown evidence type encountered');
      }
    }

    logger.debug(
      {
        counts: {
          endpoint: grouped.endpoint.length,
          payload: grouped.payload.length,
          requirement: grouped.requirement.length,
          edge_case: grouped.edge_case.length,
          acceptance_criteria: grouped.acceptance_criteria.length,
          ui_element: grouped.ui_element.length,
          flow: grouped.flow.length,
          bug: grouped.bug.length,
          constraint: grouped.constraint.length,
        },
      },
      'Evidence grouped by type'
    );

    return grouped;
  }

  /**
   * Get evidence counts by type for a feature
   * @param featureId Feature UUID
   * @returns Count of evidence by type
   */
  async getEvidenceCounts(
    featureId: string
  ): Promise<Record<EvidenceType, number>> {
    const grouped = await this.collectEvidenceForFeature(featureId);

    return {
      endpoint: grouped.endpoint.length,
      payload: grouped.payload.length,
      requirement: grouped.requirement.length,
      edge_case: grouped.edge_case.length,
      acceptance_criteria: grouped.acceptance_criteria.length,
      ui_element: grouped.ui_element.length,
      flow: grouped.flow.length,
      bug: grouped.bug.length,
      constraint: grouped.constraint.length,
    };
  }
}
