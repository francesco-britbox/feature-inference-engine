/**
 * Logger utility using Pino
 * Provides structured logging with appropriate levels
 */

import pino from 'pino';

/**
 * Create logger instance with appropriate configuration
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Disable pino-pretty to avoid worker thread issues in Next.js
});

/**
 * Create child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
