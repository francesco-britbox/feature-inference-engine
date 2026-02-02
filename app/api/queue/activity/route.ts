/**
 * Activity Log API
 * GET /api/queue/activity - Returns recent activity logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { activityLogService } from '@/lib/services/ActivityLogService';
import type { ActivityLog } from '@/lib/types/activity';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/queue/activity
 * Returns recent activity logs for real-time monitoring
 *
 * Query parameters:
 * - limit: Maximum number of logs to return (default: 50, max: 100)
 * - level: Filter by log level (info, success, error, warning)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ActivityLog[]>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const levelParam = searchParams.get('level');

    // Parse limit
    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        limit = parsed;
      }
    }

    // Get logs (filtered or all)
    let logs: ActivityLog[];
    if (levelParam && ['info', 'success', 'error', 'warning'].includes(levelParam)) {
      logs = activityLogService.getLogsByLevel(
        levelParam as 'info' | 'success' | 'error' | 'warning',
        limit
      );
    } else {
      logs = activityLogService.getLogs(limit);
    }

    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    logger.error({ error, endpoint: '/api/queue/activity' }, 'Failed to fetch activity logs');
    return NextResponse.json(
      [],
      { status: 500 }
    );
  }
}
