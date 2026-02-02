/**
 * Documents List API
 * GET /api/documents - List all documents with status
 */

import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';

interface DocumentItem {
  id: string;
  filename: string;
  fileType: string;
  status: string;
  uploadedAt: string;
  processedAt: string | null;
  errorMessage: string | null;
}

/**
 * GET /api/documents
 * Returns list of all uploaded documents
 */
export async function GET(): Promise<NextResponse<DocumentItem[] | { error: string }>> {
  try {
    const allDocuments = await db
      .select()
      .from(documents)
      .orderBy(desc(documents.uploadedAt));

    const items: DocumentItem[] = allDocuments.map((doc) => ({
      id: doc.id,
      filename: doc.filename,
      fileType: doc.fileType,
      status: doc.status,
      uploadedAt: doc.uploadedAt.toISOString(),
      processedAt: doc.processedAt?.toISOString() || null,
      errorMessage: doc.errorMessage,
    }));

    return NextResponse.json(items, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}
