/**
 * Jira Cleanup API
 * POST /api/jira/clear - Clear all generated folders
 *
 * Single Responsibility: Handle cleanup of temporary Jira folders
 */

import { NextResponse } from 'next/server';
import { jiraFolderGeneratorService } from '@/lib/services/JiraFolderGeneratorService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'JiraClearAPI' });

export async function POST(): Promise<NextResponse> {
  logger.info('Clearing all Jira temp folders');

  try {
    const count = await jiraFolderGeneratorService.clearAllFolders();

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} folder(s)`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to clear Jira folders');

    return NextResponse.json(
      {
        error: 'Clear failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
