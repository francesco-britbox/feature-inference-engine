/**
 * System Stats API
 * GET /api/stats - Returns system-wide statistics
 */

import { NextResponse } from 'next/server';
import { StatsService, type SystemStats } from '@/lib/services/StatsService';

/**
 * GET /api/stats
 * Returns comprehensive system statistics
 */
export async function GET(): Promise<NextResponse<SystemStats | { error: string; details: string }>> {
  try {
    const statsService = new StatsService();
    const stats = await statsService.getSystemStats();

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
