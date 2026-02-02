/**
 * Feature Detail API
 * GET /api/features/:id - Get feature details with evidence
 * PATCH /api/features/:id - Update feature
 * DELETE /api/features/:id - Delete feature
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { features, featureEvidence, evidence } from '@/lib/db/schema';

interface FeatureDetail {
  id: string;
  name: string;
  description: string | null;
  confidenceScore: string | null;
  status: string;
  inferredAt: string;
  reviewedAt: string | null;
  evidence: {
    id: string;
    type: string;
    content: string;
    relationshipType: string;
    strength: string | null;
    reasoning: string | null;
  }[];
}

interface UpdateFeatureRequest {
  name?: string;
  description?: string;
  status?: 'candidate' | 'confirmed' | 'rejected';
}

/**
 * GET /api/features/:id
 * Returns feature details with linked evidence
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<FeatureDetail | { error: string }>> {
  try {
    const { id } = await context.params;

    // Get feature
    const [feature] = await db
      .select()
      .from(features)
      .where(eq(features.id, id));

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Get linked evidence
    const evidenceLinks = await db
      .select({
        evidenceId: featureEvidence.evidenceId,
        relationshipType: featureEvidence.relationshipType,
        strength: featureEvidence.strength,
        reasoning: featureEvidence.reasoning,
        type: evidence.type,
        content: evidence.content,
      })
      .from(featureEvidence)
      .leftJoin(evidence, eq(featureEvidence.evidenceId, evidence.id))
      .where(eq(featureEvidence.featureId, id));

    const response: FeatureDetail = {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      confidenceScore: feature.confidenceScore,
      status: feature.status,
      inferredAt: feature.inferredAt.toISOString(),
      reviewedAt: feature.reviewedAt?.toISOString() || null,
      evidence: evidenceLinks.map((link) => ({
        id: link.evidenceId,
        type: link.type || 'unknown',
        content: link.content || '',
        relationshipType: link.relationshipType,
        strength: link.strength,
        reasoning: link.reasoning,
      })),
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch feature', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/features/:id
 * Update feature details
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<FeatureDetail | { error: string }>> {
  try {
    const { id } = await context.params;
    const body: UpdateFeatureRequest = await request.json();

    // Check if feature exists
    const [existing] = await db
      .select()
      .from(features)
      .where(eq(features.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Update feature
    const updateData: Partial<typeof features.$inferInsert> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;
      updateData.reviewedAt = new Date();
    }

    await db
      .update(features)
      .set(updateData)
      .where(eq(features.id, id));

    // Return updated feature
    return GET(request, context);

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update feature', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/:id
 * Delete a feature (cascades to evidence relationships)
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { id } = await context.params;

    // Check if feature exists
    const [existing] = await db
      .select()
      .from(features)
      .where(eq(features.id, id));

    if (!existing) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Delete feature (cascade will delete relationships)
    await db
      .delete(features)
      .where(eq(features.id, id));

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete feature', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}
