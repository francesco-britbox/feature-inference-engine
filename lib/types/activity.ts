/**
 * Activity Log Types
 * Real-time monitoring of system activity
 */

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  documentId?: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Activity log level type
 */
export type ActivityLevel = ActivityLog['level'];
