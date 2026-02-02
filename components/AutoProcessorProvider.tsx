/**
 * Auto Processor Provider
 * Single Responsibility: Start queue auto-processor globally
 * Client component that runs on all pages
 */

'use client';

import { useEffect } from 'react';
import { startAutoProcessor } from '@/lib/workers/autoProcessor';

export function AutoProcessorProvider(): null {
  useEffect(() => {
    // Start auto-processor when app loads
    startAutoProcessor();
  }, []);

  return null; // No UI, just side effect
}
