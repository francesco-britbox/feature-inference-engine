/**
 * Output Storage Service
 * Single Responsibility: Store feature outputs in database with versioning
 * Follows SRP & DRY - centralizes all storage logic
 */

import { db } from '@/lib/db/client';
import { featureOutputs } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'OutputStorageService' });

/**
 * Output type for feature outputs
 */
type OutputType = 'api_contract' | 'requirements' | 'acceptance_criteria';

/**
 * Output Storage Service
 * Centralizes storage logic for all feature outputs (DRY principle)
 */
export class OutputStorageService {
  /**
   * Store any feature output with automatic versioning
   * @param featureId Feature UUID
   * @param outputType Type of output
   * @param content Output content
   * @returns Output record ID
   */
  async storeOutput(
    featureId: string,
    outputType: OutputType,
    content: Record<string, unknown>
  ): Promise<string> {
    logger.info({ featureId, outputType }, 'Storing feature output');

    try {
      // Check for existing output
      const existing = await db
        .select()
        .from(featureOutputs)
        .where(
          and(
            eq(featureOutputs.featureId, featureId),
            eq(featureOutputs.outputType, outputType)
          )
        )
        .limit(1);

      let version = 1;
      if (existing.length > 0) {
        // Increment version
        const maxVersion = await db
          .select({ maxVersion: sql<number>`MAX(${featureOutputs.version})` })
          .from(featureOutputs)
          .where(
            and(
              eq(featureOutputs.featureId, featureId),
              eq(featureOutputs.outputType, outputType)
            )
          );

        version = (maxVersion[0]?.maxVersion || 0) + 1;
      }

      // Insert new record
      const records = await db
        .insert(featureOutputs)
        .values({
          featureId,
          outputType,
          content,
          version,
        })
        .returning();

      const record = records[0];
      if (!record) {
        throw new Error(`Failed to insert ${outputType} record`);
      }

      logger.info(
        { featureId, outputId: record.id, version, outputType },
        'Feature output stored'
      );

      return record.id;
    } catch (error) {
      logger.error(
        {
          featureId,
          outputType,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to store feature output'
      );
      throw error;
    }
  }
}
