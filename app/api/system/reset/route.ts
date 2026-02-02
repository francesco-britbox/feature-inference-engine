/**
 * System Reset API
 * POST /api/system/reset - Delete all data (DANGEROUS OPERATION)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  documents,
  evidence,
  features,
  featureEvidence,
  featureOutputs,
  processingJobs,
  enrichmentSources,
  guidelineCache,
} from '@/lib/db/schema';
import { createLogger } from '@/lib/utils/logger';
import { activityLogService } from '@/lib/services/ActivityLogService';
import { InvalidDataError } from '@/lib/utils/errors';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ service: 'SystemResetAPI' });

/**
 * POST /api/system/reset
 * Deletes ALL data from database and file storage
 * Requires exact confirmation text: "DELETE ALL DATA"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.warn('System reset requested');

  try {
    // Parse and validate request body
    const body = (await request.json()) as { confirmation: string };

    // Verify exact confirmation text
    if (body.confirmation !== 'DELETE ALL DATA') {
      logger.warn({ confirmation: body.confirmation }, 'Invalid confirmation text');
      throw new InvalidDataError(
        'Invalid confirmation text. Must be exactly: DELETE ALL DATA',
        'confirmation'
      );
    }

    // Count records before deletion (for logging)
    const counts = {
      documents: await db.select().from(documents).then((r) => r.length),
      evidence: await db.select().from(evidence).then((r) => r.length),
      features: await db.select().from(features).then((r) => r.length),
      featureEvidence: await db.select().from(featureEvidence).then((r) => r.length),
      featureOutputs: await db.select().from(featureOutputs).then((r) => r.length),
      processingJobs: await db.select().from(processingJobs).then((r) => r.length),
      enrichmentSources: await db.select().from(enrichmentSources).then((r) => r.length),
      guidelineCache: await db.select().from(guidelineCache).then((r) => r.length),
    };

    logger.warn({ counts }, 'Starting system reset - deleting all data');

    // Delete from database in transaction (atomicity)
    await db.transaction(async (tx) => {
      // Delete in correct order (children first to avoid FK violations)
      await tx.delete(featureOutputs);
      await tx.delete(enrichmentSources);
      await tx.delete(guidelineCache);
      await tx.delete(featureEvidence);
      await tx.delete(features);
      await tx.delete(evidence);
      await tx.delete(processingJobs);
      await tx.delete(documents);
    });

    logger.warn('Database tables cleared');

    // Delete file storage
    const docsPath = path.join(process.cwd(), 'app', 'docs');
    let filesDeleted = 0;

    try {
      const entries = await fs.readdir(docsPath);

      // Delete each document folder
      for (const entry of entries) {
        const entryPath = path.join(docsPath, entry);
        const stats = await fs.stat(entryPath);

        if (stats.isDirectory()) {
          await fs.rm(entryPath, { recursive: true, force: true });
          filesDeleted++;
        }
      }

      logger.warn({ path: docsPath, filesDeleted }, 'File storage cleared');
    } catch (fsError) {
      logger.error({ path: docsPath, error: fsError }, 'File deletion failed');
      // Continue - database deletion succeeded
    }

    // Clear activity logs
    activityLogService.clearLogs();
    logger.warn('Activity logs cleared');

    // Log final reset completion
    activityLogService.addLog(
      'warning',
      '⚠️ SYSTEM RESET: All data deleted',
      { metadata: counts }
    );

    logger.warn({ counts, filesDeleted }, 'System reset completed successfully');

    return NextResponse.json(
      {
        success: true,
        message: 'All data deleted successfully',
        deleted: {
          ...counts,
          files: filesDeleted,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof InvalidDataError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }

    logger.error({ error }, 'System reset failed');

    return NextResponse.json(
      {
        error: 'System reset failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
