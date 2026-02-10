/**
 * Ticket Config API
 * GET - Fetch current config (or defaults)
 * PUT - Update config
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ticketConfig } from '@/lib/db/schema';
import { DEFAULT_TICKET_CONFIG } from '@/lib/types/ticketConfig';
import { eq } from 'drizzle-orm';

export async function GET(): Promise<NextResponse> {
  try {
    const [config] = await db.select().from(ticketConfig).limit(1);

    if (!config) {
      return NextResponse.json({
        ...DEFAULT_TICKET_CONFIG,
        id: null,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch ticket config: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const {
      projectKey,
      projectName,
      reporter,
      defaultPriority,
      targetPlatforms,
      targetRegions,
      sprintName,
      toolName,
      authorName,
      keyCounter,
    } = body as {
      projectKey?: string;
      projectName?: string;
      reporter?: string;
      defaultPriority?: string;
      targetPlatforms?: Array<{ platform: string; enabled: boolean }>;
      targetRegions?: Array<{ name: string; enabled: boolean }>;
      sprintName?: string | null;
      toolName?: string;
      authorName?: string;
      keyCounter?: number;
    };

    // Check if config exists
    const [existing] = await db.select({ id: ticketConfig.id }).from(ticketConfig).limit(1);

    const values: Record<string, unknown> = {
      projectKey: projectKey || DEFAULT_TICKET_CONFIG.projectKey,
      projectName: projectName || DEFAULT_TICKET_CONFIG.projectName,
      reporter: reporter || DEFAULT_TICKET_CONFIG.reporter,
      defaultPriority: defaultPriority || DEFAULT_TICKET_CONFIG.defaultPriority,
      targetPlatforms: targetPlatforms || DEFAULT_TICKET_CONFIG.targetPlatforms,
      targetRegions: targetRegions || DEFAULT_TICKET_CONFIG.targetRegions,
      sprintName: sprintName ?? null,
      toolName: toolName || DEFAULT_TICKET_CONFIG.toolName,
      authorName: authorName || DEFAULT_TICKET_CONFIG.authorName,
      updatedAt: new Date(),
    };

    // Only include keyCounter if explicitly provided (allows reset)
    if (keyCounter !== undefined) {
      values.keyCounter = keyCounter;
    }

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(ticketConfig)
        .set(values)
        .where(eq(ticketConfig.id, existing.id))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Insert new
      const [created] = await db
        .insert(ticketConfig)
        .values(values)
        .returning();

      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update ticket config: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
