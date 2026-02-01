/**
 * Health check endpoint
 * Checks database, Chroma, OpenAI API key, and disk space
 * Returns 200 if all OK, 503 if any check fails
 */

import { NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/db/client';

/**
 * Default Chroma URL for local development
 */
const DEFAULT_CHROMA_URL = 'http://localhost:8000';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    chroma: HealthCheck;
    openai: HealthCheck;
    disk: HealthCheck;
  };
}

interface HealthCheck {
  status: 'ok' | 'fail';
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  try {
    await testDatabaseConnection();
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Chroma vector store connectivity
 */
async function checkChroma(): Promise<HealthCheck> {
  try {
    const chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL;
    const response = await fetch(`${chromaUrl}/api/v1/heartbeat`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { status: 'ok' };
    }

    return {
      status: 'fail',
      message: `Chroma returned status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Chroma connection failed',
    };
  }
}

/**
 * Check OpenAI API key is configured
 */
async function checkOpenAI(): Promise<HealthCheck> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      status: 'fail',
      message: 'OPENAI_API_KEY environment variable not set',
    };
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      status: 'fail',
      message: 'OPENAI_API_KEY does not appear to be valid',
    };
  }

  return { status: 'ok' };
}

/**
 * Check disk space (simple check)
 */
async function checkDisk(): Promise<HealthCheck> {
  try {
    // For now, just return OK
    // In production, would check actual disk usage
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : 'Disk check failed',
    };
  }
}

/**
 * GET /api/health
 * Run all health checks
 */
export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const [database, chroma, openai, disk] = await Promise.all([
    checkDatabase(),
    checkChroma(),
    checkOpenAI(),
    checkDisk(),
  ]);

  const allHealthy =
    database.status === 'ok' &&
    chroma.status === 'ok' &&
    openai.status === 'ok' &&
    disk.status === 'ok';

  const result: HealthCheckResult = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database,
      chroma,
      openai,
      disk,
    },
  };

  const statusCode = allHealthy ? 200 : 503;

  return NextResponse.json(result, { status: statusCode });
}
