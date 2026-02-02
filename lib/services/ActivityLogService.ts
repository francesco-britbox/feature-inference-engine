/**
 * Activity Log Service
 * Single Responsibility: Manage in-memory activity logs for real-time monitoring
 * Follows SRP: Only handles log storage and retrieval
 */

import type { ActivityLog, ActivityLevel } from '@/lib/types/activity';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'ActivityLogService' });

/**
 * Maximum number of logs to retain in memory
 */
const MAX_LOGS = 100;

/**
 * Activity Log Service
 * In-memory queue for real-time activity monitoring
 */
export class ActivityLogService {
  private logs: ActivityLog[] = [];

  /**
   * Add a new activity log entry
   * Automatically prunes old logs to maintain MAX_LOGS limit
   *
   * @param level - Log level (info, success, error, warning)
   * @param message - Log message
   * @param metadata - Optional metadata (documentId, jobId, etc.)
   */
  addLog(
    level: ActivityLevel,
    message: string,
    metadata?: {
      documentId?: string;
      jobId?: string;
      [key: string]: unknown;
    }
  ): void {
    const log: ActivityLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      documentId: metadata?.documentId,
      jobId: metadata?.jobId,
      metadata,
    };

    this.logs.unshift(log); // Add to front (newest first)

    // Prune old logs
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    logger.debug({ level, message }, 'Activity log added');
  }

  /**
   * Get recent activity logs
   *
   * @param limit - Maximum number of logs to return (default: 50)
   * @returns Array of activity logs (newest first)
   */
  getLogs(limit: number = 50): ActivityLog[] {
    return this.logs.slice(0, Math.min(limit, this.logs.length));
  }

  /**
   * Clear all activity logs
   */
  clearLogs(): void {
    this.logs = [];
    logger.info('Activity logs cleared');
  }

  /**
   * Get logs filtered by level
   *
   * @param level - Log level to filter by
   * @param limit - Maximum number of logs to return
   * @returns Filtered activity logs
   */
  getLogsByLevel(level: ActivityLevel, limit: number = 50): ActivityLog[] {
    return this.logs
      .filter((log) => log.level === level)
      .slice(0, Math.min(limit, this.logs.length));
  }

  /**
   * Get logs for a specific document
   *
   * @param documentId - Document ID to filter by
   * @returns Activity logs for the document
   */
  getLogsByDocument(documentId: string): ActivityLog[] {
    return this.logs.filter((log) => log.documentId === documentId);
  }

  /**
   * Get log count by level
   *
   * @returns Count of logs by level
   */
  getLogCounts(): Record<ActivityLevel, number> {
    const counts: Record<ActivityLevel, number> = {
      info: 0,
      success: 0,
      error: 0,
      warning: 0,
    };

    for (const log of this.logs) {
      counts[log.level]++;
    }

    return counts;
  }
}

/**
 * Singleton instance
 */
export const activityLogService = new ActivityLogService();
