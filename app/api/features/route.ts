/**
 * Features API
 * GET /api/features - List features with filters
 * POST /api/features - Create a new feature
 */

import { NextResponse } from 'next/server';
import { eq, desc, and, gte, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { features } from '@/lib/db/schema';

interface FeatureListParams {
  status?: 'candidate' | 'confirmed' | 'rejected';
  minConfidence?: number;
  type?: 'epic' | 'story' | 'task';
  parent?: string | 'null';
}

interface FeatureItem {
  id: string;
  name: string;
  description: string | null;
  confidenceScore: string | null;
  status: string;
  inferredAt: string;
  reviewedAt: string | null;
}

interface CreateFeatureRequest {
  name: string;
  description?: string;
  confidenceScore?: number;
  status?: 'candidate' | 'confirmed' | 'rejected';
}

/**
 * GET /api/features
 * Returns list of features with optional filters
 */
export async function GET(request: Request): Promise<NextResponse<FeatureItem[] | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);

    const params: FeatureListParams = {
      status: (searchParams.get('status') as 'candidate' | 'confirmed' | 'rejected') || undefined,
      minConfidence: searchParams.get('minConfidence') ? parseFloat(searchParams.get('minConfidence')!) : undefined,
      type: (searchParams.get('type') as 'epic' | 'story' | 'task') || undefined,
      parent: searchParams.get('parent') || undefined,
    };

    // Build where conditions
    const conditions = [];

    if (params.status) {
      conditions.push(eq(features.status, params.status));
    }

    if (params.minConfidence !== undefined) {
      conditions.push(gte(features.confidenceScore, params.minConfidence.toString()));
    }

    // Filter by feature type
    if (params.type && ['epic', 'story', 'task'].includes(params.type)) {
      conditions.push(eq(features.featureType, params.type));
    }

    // Filter by parent
    if (params.parent === 'null') {
      conditions.push(isNull(features.parentId));
    } else if (params.parent) {
      conditions.push(eq(features.parentId, params.parent));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get features
    const featureRecords = await db
      .select()
      .from(features)
      .where(whereClause)
      .orderBy(desc(features.confidenceScore), desc(features.inferredAt));

    const items: FeatureItem[] = featureRecords.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      confidenceScore: record.confidenceScore,
      status: record.status,
      inferredAt: record.inferredAt.toISOString(),
      reviewedAt: record.reviewedAt?.toISOString() || null,
    }));

    return NextResponse.json(items, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch features', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features
 * Create a new feature
 */
export async function POST(request: Request): Promise<NextResponse<FeatureItem | { error: string }>> {
  try {
    const body: CreateFeatureRequest = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    const [newFeature] = await db
      .insert(features)
      .values({
        name: body.name,
        description: body.description || null,
        confidenceScore: body.confidenceScore?.toString() || '0.5',
        status: body.status || 'candidate',
      })
      .returning();

    if (!newFeature) {
      return NextResponse.json(
        { error: 'Failed to create feature' },
        { status: 500 }
      );
    }

    const response: FeatureItem = {
      id: newFeature.id,
      name: newFeature.name,
      description: newFeature.description,
      confidenceScore: newFeature.confidenceScore,
      status: newFeature.status,
      inferredAt: newFeature.inferredAt.toISOString(),
      reviewedAt: newFeature.reviewedAt?.toISOString() || null,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create feature', details: error instanceof Error ? error.message : String(error) } as { error: string; details: string },
      { status: 500 }
    );
  }
}
