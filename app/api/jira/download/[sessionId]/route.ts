/**
 * Jira Download API
 * GET /api/jira/download/:sessionId - Download zip file
 *
 * Single Responsibility: Handle zip file generation and download
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import archiver from 'archiver';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const logger = createLogger({ service: 'JiraDownloadAPI' });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId } = await params;

  logger.info({ sessionId }, 'Jira download requested');

  try {
    const sourcePath = path.join(process.cwd(), 'temp', 'jira', sessionId);
    const zipPath = path.join(process.cwd(), 'temp', `${sessionId}.zip`);

    // Verify folder exists
    try {
      await fsPromises.access(sourcePath);
    } catch {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    // Create zip file
    await zipFolder(sourcePath, zipPath);

    logger.info({ sessionId, zipPath }, 'Zip file created');

    // Read zip file
    const zipBuffer = await fsPromises.readFile(zipPath);

    // Clean up zip file after reading
    await fsPromises.rm(zipPath, { force: true });

    // Return zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="jira-tickets-${sessionId}.zip"`,
      },
    });
  } catch (error) {
    logger.error({ sessionId, error }, 'Download failed');

    return NextResponse.json(
      {
        error: 'Download failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Zip a folder using archiver
 */
async function zipFolder(sourceFolder: string, outputZip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZip);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceFolder, false);
    archive.finalize();
  });
}
