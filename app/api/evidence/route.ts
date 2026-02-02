/**
 * Evidence API
 * GET /api/evidence - List evidence with filters and pagination
 */

import { NextResponse } from 'next/server';
import { eq, desc, and, like } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { evidence, documents } from '@/lib/db/schema';

interface EvidenceListParams {
  page?: number;
  limit?: number;
  type?: string;
  documentId?: string;
  search?: string;
}

interface EvidenceItem {
  id: string;
  documentId: string;
  documentFilename: string;
  type: string;
  content: string;
  rawData: unknown;
  extractedAt: string;
}

interface EvidenceListResponse {
  items: EvidenceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * GET /api/evidence
 * Returns paginated list of evidence with optional filters
 */
export async function GET(request: Request): Promise<NextResponse<EvidenceListResponse | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);

    const params: EvidenceListParams = {
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(parseInt(searchParams.get('limit') || '50', 10), 100),
      type: searchParams.get('type') || undefined,
      documentId: searchParams.get('documentId') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Build where conditions
    const conditions = [];

    if (params.type) {
      conditions.push(eq(evidence.type, params.type));
    }

    if (params.documentId) {
      conditions.push(eq(evidence.documentId, params.documentId));
    }

    if (params.search) {
      conditions.push(like(evidence.content, `%${params.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalRecords = await db
      .select()
      .from(evidence)
      .where(whereClause);

    const total = totalRecords.length;

    // Get paginated results with document info
    const offset = (params.page! - 1) * params.limit!;

    const evidenceRecords = await db
      .select({
        id: evidence.id,
        documentId: evidence.documentId,
        type: evidence.type,
        content: evidence.content,
        rawData: evidence.rawData,
        extractedAt: evidence.extractedAt,
        documentFilename: documents.filename,
      })
      .from(evidence)
      .leftJoin(documents, eq(evidence.documentId, documents.id))
      .where(whereClause)
      .orderBy(desc(evidence.extractedAt))
      .limit(params.limit!)
      .offset(offset);

    const items: EvidenceItem[] = evidenceRecords.map((record) => ({
      id: record.id,
      documentId: record.documentId,
      documentFilename: record.documentFilename || 'Unknown',
      type: record.type,
      content: record.content,
      rawData: record.rawData,
      extractedAt: record.extractedAt.toISOString(),
    }));

    const response: EvidenceListResponse = {
      items,
      pagination: {
        page: params.page!,
        limit: params.limit!,
        total,
        totalPages: Math.ceil(total / params.limit!),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch evidence', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}
