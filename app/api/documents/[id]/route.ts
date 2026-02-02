/**
 * Document Detail API
 * GET /api/documents/:id - Get document details
 * DELETE /api/documents/:id - Delete document and associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents, evidence } from '@/lib/db/schema';
import { createLogger } from '@/lib/utils/logger';
import { NotFoundError } from '@/lib/utils/errors';
import { activityLogService } from '@/lib/services/ActivityLogService';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ service: 'DocumentAPI' });

/**
 * GET /api/documents/:id
 * Returns document details with evidence count
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!document) {
      throw new NotFoundError('Document', id);
    }

    // Get evidence count
    const evidenceCount = await db
      .select()
      .from(evidence)
      .where(eq(evidence.documentId, id));

    return NextResponse.json(
      {
        ...document,
        evidenceCount: evidenceCount.length,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    logger.error({ documentId: id, error }, 'Failed to fetch document');
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/:id
 * Deletes document, associated evidence, jobs, and file storage
 * Cascades: documents → evidence, documents → processing_jobs
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  logger.info({ documentId: id }, 'Deleting document');

  try {
    // Get document to verify existence and get details
    const [document] = await db.select().from(documents).where(eq(documents.id, id));

    if (!document) {
      throw new NotFoundError('Document', id);
    }

    // Count associated data for logging
    const evidenceCount = await db
      .select()
      .from(evidence)
      .where(eq(evidence.documentId, id));

    // Delete from database (cascade handles evidence and processing_jobs)
    await db.delete(documents).where(eq(documents.id, id));

    // Delete file storage
    const docPath = path.join(process.cwd(), 'app', 'docs', id);
    try {
      await fs.rm(docPath, { recursive: true, force: true });
      logger.info({ documentId: id, path: docPath }, 'File storage deleted');
    } catch (fsError) {
      logger.warn({ documentId: id, path: docPath, error: fsError }, 'File deletion warning');
      // Continue - database deletion succeeded, file may not exist
    }

    // Log activity
    activityLogService.addLog(
      'success',
      `🗑️ Deleted document: ${document.filename} (${evidenceCount.length} evidence items)`,
      { documentId: id }
    );

    logger.info(
      {
        documentId: id,
        filename: document.filename,
        evidenceDeleted: evidenceCount.length,
      },
      'Document deleted successfully'
    );

    return NextResponse.json(
      {
        success: true,
        deleted: {
          document: 1,
          evidence: evidenceCount.length,
          filename: document.filename,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    logger.error({ documentId: id, error }, 'Failed to delete document');

    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
