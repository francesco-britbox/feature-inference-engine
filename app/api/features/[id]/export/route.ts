/**
 * Feature Export API Endpoint
 * GET /api/features/:id/export?format=json|md|csv
 * Returns formatted export based on query parameter
 */

import { NextRequest, NextResponse } from 'next/server';
import { TicketService } from '@/lib/services/TicketService';
import { ExportService } from '@/lib/services/ExportService';
import type { ExportFormat } from '@/lib/types/ticket';
import { createLogger } from '@/lib/utils/logger';
import { InvalidDataError, NotFoundError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'ExportAPI' });

/**
 * GET /api/features/:id/export?format=json|md|csv
 * Export feature as Jira epic in specified format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const featureId = resolvedParams.id;

  logger.info({ featureId }, 'Export request received');

  try {
    // Validate feature ID
    if (!featureId) {
      throw new InvalidDataError('Feature ID is required', 'featureId');
    }

    // Get format from query parameter
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') as ExportFormat | null;

    if (!format || !['json', 'md', 'csv'].includes(format)) {
      throw new InvalidDataError(
        'Format must be one of: json, md, csv',
        'format'
      );
    }

    // Generate epic
    const ticketService = new TicketService();
    const epic = await ticketService.generateEpic(featureId);

    // Export to requested format
    const exportService = new ExportService();
    const exported = exportService.exportEpic(epic, format);

    // Determine content type and filename
    const contentType = getContentType(format);
    const filename = getFilename(epic.title, format);

    logger.info(
      { featureId, format, filename },
      'Export successful'
    );

    // Return file for download
    return new NextResponse(exported, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        featureId,
        error: errorMessage,
      },
      'Export failed'
    );

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error instanceof InvalidDataError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to export feature' },
      { status: 500 }
    );
  }
}

/**
 * Get content type for format
 * @param format Export format
 * @returns MIME type
 */
function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'md':
      return 'text/markdown';
    case 'csv':
      return 'text/csv';
  }
}

/**
 * Get filename for export
 * @param epicTitle Epic title
 * @param format Export format
 * @returns Filename
 */
function getFilename(epicTitle: string, format: ExportFormat): string {
  const sanitized = epicTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const extension = format === 'md' ? 'md' : format;
  return `${sanitized}.${extension}`;
}
