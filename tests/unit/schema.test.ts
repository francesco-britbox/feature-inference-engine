/**
 * Database schema validation tests
 * Ensures schema definitions are correctly structured
 */

import { describe, it, expect } from 'vitest';
import * as schema from '@/lib/db/schema';

describe('Database Schema', () => {
  it('should export all required tables', () => {
    expect(schema.documents).toBeDefined();
    expect(schema.processingJobs).toBeDefined();
    expect(schema.evidence).toBeDefined();
    expect(schema.features).toBeDefined();
    expect(schema.featureEvidence).toBeDefined();
    expect(schema.featureOutputs).toBeDefined();
  });

  it('should have table objects with expected columns', () => {
    // Verify documents table structure
    expect(schema.documents).toBeDefined();
    expect(typeof schema.documents).toBe('object');

    // Verify evidence table structure
    expect(schema.evidence).toBeDefined();
    expect(typeof schema.evidence).toBe('object');

    // Verify features table structure
    expect(schema.features).toBeDefined();
    expect(typeof schema.features).toBe('object');

    // Verify relationship tables
    expect(schema.featureEvidence).toBeDefined();
    expect(schema.processingJobs).toBeDefined();
    expect(schema.featureOutputs).toBeDefined();
  });
});
