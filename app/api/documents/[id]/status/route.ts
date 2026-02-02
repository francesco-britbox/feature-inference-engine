/**
 * Document Status API
 * Returns processing status for a document
 * GET /api/documents/:id/status
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents, processingJobs, evidence } from '@/lib/db/schema';

interface DocumentStatus {
  documentId: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: {
    stage: 'extraction' | 'embedding' | 'inference';
    message: string;
  };
  error?: string;
  evidenceCount?: number;
}

/**
 * GET /api/documents/:id/status
 * Returns document processing status
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<DocumentStatus | { error: string }>> {
  try {
    const { id } = await context.params;

    // Fetch document
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Fetch latest processing job
    const [job] = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.documentId, id))
      .orderBy(processingJobs.createdAt)
      .limit(1);

    // Count evidence
    const evidenceRecords = await db
      .select()
      .from(evidence)
      .where(eq(evidence.documentId, id));

    // Determine progress stage
    const stage = determineStage((job?.jobType as 'extract' | 'embed' | 'infer') || 'extract');
    const message = generateProgressMessage(document.status, job);

    const response: DocumentStatus = {
      documentId: document.id,
      filename: document.filename,
      status: document.status as DocumentStatus['status'],
      progress: {
        stage,
        message,
      },
      evidenceCount: evidenceRecords.length,
    };

    if (document.status === 'failed') {
      response.error = document.errorMessage || 'Processing failed';
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch status',
        details: error instanceof Error ? error.message : String(error),
      } as { error: string; details: string },
      { status: 500 }
    );
  }
}

/**
 * Determine processing stage from job type
 */
function determineStage(
  jobType: 'extract' | 'embed' | 'infer'
): 'extraction' | 'embedding' | 'inference' {
  const mapping: Record<typeof jobType, DocumentStatus['progress']['stage']> = {
    extract: 'extraction',
    embed: 'embedding',
    infer: 'inference',
  };

  return mapping[jobType];
}

/**
 * Generate user-friendly progress message
 */
function generateProgressMessage(
  documentStatus: string,
  job: { status: string; retryCount: number } | undefined
): string {
  if (!job) {
    return 'Waiting to start';
  }

  switch (documentStatus) {
    case 'uploaded':
      return 'Queued for processing';
    case 'processing':
      if (job.retryCount > 0) {
        return `Processing (retry ${job.retryCount})`;
      }
      return 'Processing document';
    case 'completed':
      return 'Processing complete';
    case 'failed':
      return job.retryCount >= 3
        ? 'Processing failed (max retries exceeded)'
        : 'Processing failed';
    default:
      return 'Unknown status';
  }
}
