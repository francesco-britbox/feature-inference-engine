/**
 * Database schema for Feature Inference Engine
 * PostgreSQL with pgvector extension
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  vector,
  integer,
  boolean,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * documents table
 * Stores metadata for uploaded files
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: text('filename').notNull(),
    fileType: text('file_type').notNull(),
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash').notNull().unique(),
    status: text('status').default('uploaded').notNull(),
    version: integer('version').default(1).notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    checkStatus: check(
      'check_status',
      sql`${table.status} IN ('uploaded', 'processing', 'completed', 'failed')`
    ),
  })
);

/**
 * processing_jobs table
 * Persistent queue for extraction jobs - ZERO DATA LOSS
 */
export const processingJobs = pgTable(
  'processing_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    jobType: text('job_type').default('extract').notNull(),
    status: text('status').default('pending').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    checkStatus: check(
      'check_job_status',
      sql`${table.status} IN ('pending', 'processing', 'completed', 'failed')`
    ),
    checkJobType: check(
      'check_job_type',
      sql`${table.jobType} IN ('extract', 'embed', 'infer')`
    ),
  })
);

/**
 * evidence table
 * Atomic facts extracted from documents
 */
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type').notNull(),
    content: text('content').notNull(),
    rawData: jsonb('raw_data'),
    embedding: vector('embedding', { dimensions: 3072 }),
    obsolete: boolean('obsolete').default(false).notNull(),
    extractedAt: timestamp('extracted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    checkType: check(
      'check_evidence_type',
      sql`${table.type} IN (
        'ui_element',
        'flow',
        'endpoint',
        'payload',
        'requirement',
        'edge_case',
        'acceptance_criteria',
        'bug',
        'constraint'
      )`
    ),
  })
);

/**
 * features table
 * Inferred user-facing capabilities
 */
export const features = pgTable(
  'features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
    status: text('status').default('candidate').notNull(),
    inferredAt: timestamp('inferred_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: text('reviewed_by'),
    enrichmentStatus: text('enrichment_status').default('pending'),
    enrichedAt: timestamp('enriched_at', { withTimezone: true }),
    enrichmentError: text('enrichment_error'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    checkStatus: check(
      'check_feature_status',
      sql`${table.status} IN ('candidate', 'confirmed', 'rejected')`
    ),
    checkConfidence: check(
      'check_confidence_range',
      sql`${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 1`
    ),
    checkEnrichmentStatus: check(
      'check_enrichment_status',
      sql`${table.enrichmentStatus} IN ('pending', 'enriching', 'completed', 'failed', 'skipped')`
    ),
  })
);

/**
 * feature_evidence table
 * Graph relationships between features and evidence
 */
export const featureEvidence = pgTable(
  'feature_evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    featureId: uuid('feature_id')
      .references(() => features.id, { onDelete: 'cascade' })
      .notNull(),
    evidenceId: uuid('evidence_id')
      .references(() => evidence.id, { onDelete: 'cascade' })
      .notNull(),
    relationshipType: text('relationship_type').notNull(),
    strength: numeric('strength', { precision: 3, scale: 2 }),
    reasoning: text('reasoning'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueFeatureEvidence: unique('unique_feature_evidence').on(
      table.featureId,
      table.evidenceId
    ),
    checkRelationshipType: check(
      'check_relationship_type',
      sql`${table.relationshipType} IN ('implements', 'supports', 'constrains', 'extends')`
    ),
    checkStrength: check(
      'check_strength_range',
      sql`${table.strength} >= 0 AND ${table.strength} <= 1`
    ),
  })
);

/**
 * feature_outputs table
 * Generated artifacts for export (epics, stories, contracts)
 */
export const featureOutputs = pgTable(
  'feature_outputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    featureId: uuid('feature_id')
      .references(() => features.id, { onDelete: 'cascade' })
      .notNull(),
    outputType: text('output_type').notNull(),
    content: jsonb('content').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    checkOutputType: check(
      'check_output_type',
      sql`${table.outputType} IN (
        'epic',
        'story',
        'acceptance_criteria',
        'api_contract',
        'requirements'
      )`
    ),
  })
);

/**
 * enrichment_sources table
 * External requirements from platform guidelines, legal, accessibility, security
 */
export const enrichmentSources = pgTable(
  'enrichment_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    featureId: uuid('feature_id')
      .references(() => features.id, { onDelete: 'cascade' })
      .notNull(),
    sourceType: text('source_type').notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    content: text('content').notNull(),
    relevanceScore: numeric('relevance_score', { precision: 3, scale: 2 }),
    mandatory: boolean('mandatory').default(false).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    checkSourceType: check(
      'check_source_type',
      sql`${table.sourceType} IN (
        'ios_hig',
        'android_material',
        'apple_store',
        'google_play',
        'wcag',
        'owasp',
        'gdpr',
        'ccpa',
        'edge_case',
        'legal',
        'other'
      )`
    ),
    checkRelevanceScore: check(
      'check_relevance_score',
      sql`${table.relevanceScore} >= 0 AND ${table.relevanceScore} <= 1`
    ),
  })
);

/**
 * guideline_cache table
 * Cache for fetched platform guidelines (90-day TTL)
 */
export const guidelineCache = pgTable('guideline_cache', {
  cacheKey: text('cache_key').primaryKey(),
  content: text('content').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
