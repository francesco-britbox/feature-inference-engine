/**
 * Jira Generation API
 * POST /api/jira/generate - Generate folder structure
 *
 * Single Responsibility: Handle Jira folder generation requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { jiraFolderGeneratorService } from '@/lib/services/JiraFolderGeneratorService';
import type { JiraGenerationRequest } from '@/lib/services/JiraFolderGeneratorService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'JiraGenerateAPI' });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: JiraGenerationRequest = await request.json();

    logger.info({ request: body }, 'Jira generation requested');

    // Generate folder structure
    const outputPath = await jiraFolderGeneratorService.generateFolderStructure(body);

    // Extract session ID from path
    const sessionId = outputPath.split('/').pop();

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Folder structure generated successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Jira generation failed');

    return NextResponse.json(
      {
        error: 'Generation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
