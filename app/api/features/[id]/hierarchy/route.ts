/**
 * Feature Hierarchy API
 * GET /api/features/:id/hierarchy
 * Returns hierarchy tree (parent, children, ancestors)
 */

import { NextRequest, NextResponse } from 'next/server';
import { featureHierarchyService } from '@/lib/services/FeatureHierarchyService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'HierarchyAPI' });

/**
 * GET /api/features/:id/hierarchy
 * Get full hierarchy tree for a feature
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  logger.info({ featureId: id }, 'Fetching hierarchy tree');

  try {
    const hierarchy = await featureHierarchyService.getHierarchyTree(id);

    return NextResponse.json(hierarchy, { status: 200 });
  } catch (error) {
    logger.error(
      { featureId: id, error: error instanceof Error ? error.message : String(error) },
      'Failed to fetch hierarchy'
    );

    return NextResponse.json(
      { error: 'Failed to fetch hierarchy', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
