/**
 * Feature Parent Management API
 * PUT /api/features/:id/parent - Set parent
 * DELETE /api/features/:id/parent - Remove parent
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { features } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'ParentAPI' });

/**
 * PUT /api/features/:id/parent
 * Manually set parent for a feature
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const body = await request.json();
    const { parentId } = body;

    if (!parentId) {
      return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
    }

    logger.info({ featureId: id, parentId }, 'Setting parent for feature');

    // Validate parent exists and is an epic
    const [parent] = await db
      .select({ featureType: features.featureType })
      .from(features)
      .where(eq(features.id, parentId));

    if (!parent) {
      return NextResponse.json({ error: 'Parent feature not found' }, { status: 404 });
    }

    if (parent.featureType !== 'epic') {
      return NextResponse.json(
        { error: 'Parent must be an epic-type feature' },
        { status: 400 }
      );
    }

    // Update parent_id and adjust type
    await db
      .update(features)
      .set({
        parentId,
        featureType: 'story', // Auto-adjust type to story
        hierarchyLevel: 1,
      })
      .where(eq(features.id, id));

    logger.info({ featureId: id, parentId }, 'Parent set successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      { featureId: id, error: error instanceof Error ? error.message : String(error) },
      'Failed to set parent'
    );

    return NextResponse.json(
      { error: 'Failed to set parent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/:id/parent
 * Remove parent (make standalone epic)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    logger.info({ featureId: id }, 'Removing parent for feature');

    await db
      .update(features)
      .set({
        parentId: null,
        featureType: 'epic', // Promote to epic
        hierarchyLevel: 0,
      })
      .where(eq(features.id, id));

    logger.info({ featureId: id }, 'Parent removed successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      { featureId: id, error: error instanceof Error ? error.message : String(error) },
      'Failed to remove parent'
    );

    return NextResponse.json(
      { error: 'Failed to remove parent' },
      { status: 500 }
    );
  }
}
