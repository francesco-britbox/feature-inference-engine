/**
 * Automatic Queue Processor
 * Single Responsibility: Automatically process pending queue jobs
 * Runs in browser as client-side interval (Next.js limitation)
 */

import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'AutoProcessor' });

/**
 * Interval ID for queue processing
 */
let intervalId: NodeJS.Timeout | null = null;

/**
 * Processing interval in milliseconds
 */
const PROCESS_INTERVAL_MS = 5000; // 5 seconds

/**
 * Start automatic queue processor
 * Polls /api/queue/process every 5 seconds
 *
 * @returns True if started, false if already running
 */
export function startAutoProcessor(): boolean {
  if (intervalId) {
    logger.warn('Auto-processor already running');
    return false;
  }

  logger.info({ intervalMs: PROCESS_INTERVAL_MS }, 'Starting auto-processor');

  intervalId = setInterval(async () => {
    try {
      const response = await fetch('/api/queue/process', {
        method: 'POST',
      });

      if (!response.ok) {
        logger.error(
          { status: response.status },
          'Queue processing failed'
        );
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Auto-processor error'
      );
    }
  }, PROCESS_INTERVAL_MS);

  return true;
}

/**
 * Stop automatic queue processor
 *
 * @returns True if stopped, false if not running
 */
export function stopAutoProcessor(): boolean {
  if (!intervalId) {
    logger.warn('Auto-processor not running');
    return false;
  }

  clearInterval(intervalId);
  intervalId = null;

  logger.info('Auto-processor stopped');
  return true;
}

/**
 * Check if auto-processor is running
 *
 * @returns True if running, false otherwise
 */
export function isAutoProcessorRunning(): boolean {
  return intervalId !== null;
}
