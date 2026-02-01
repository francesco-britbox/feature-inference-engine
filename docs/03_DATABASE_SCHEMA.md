# Database Schema
## PostgreSQL + pgvector

---

## 1. Schema Overview

```
documents (uploaded files)
    ↓
processing_jobs (persistent queue - ZERO DATA LOSS)
    ↓
evidence (atomic facts)
    ↓
features (inferred capabilities)
    ↓
feature_evidence (relationships)
    ↓
feature_outputs (generated artifacts)
```

---

## 2. Tables

### 2.1 documents

**Purpose**: Store metadata for uploaded files

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'uploaded',  -- 'uploaded', 'processing', 'completed', 'failed'
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_documents_file_hash ON documents(file_hash);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);

ALTER TABLE documents ADD CONSTRAINT check_status
  CHECK (status IN ('uploaded', 'processing', 'completed', 'failed'));
```

**file_type values**: `'pdf'`, `'image'`, `'json'`, `'csv'`, `'yaml'`, `'md'`

**metadata structure**:
```json
{
  "original_name": "login-flow.png",
  "size_bytes": 102400,
  "mime_type": "image/png",
  "uploader": "user@example.com"
}
```

---

### 2.2 evidence

**Purpose**: Atomic facts extracted from documents

```sql
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  raw_data JSONB,
  embedding vector(3072),
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_document ON evidence(document_id);
CREATE INDEX idx_evidence_type ON evidence(type);
CREATE INDEX idx_evidence_extracted_at ON evidence(extracted_at DESC);

-- Vector search index
CREATE INDEX idx_evidence_embedding ON evidence
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**type values**:
- `'ui_element'` - Buttons, inputs, text from screenshots
- `'flow'` - User flows, navigation paths
- `'endpoint'` - API endpoint definitions
- `'payload'` - Request/response schemas
- `'requirement'` - Functional requirements
- `'edge_case'` - Error scenarios, corner cases
- `'acceptance_criteria'` - Testable acceptance criteria
- `'bug'` - Bug reports from Jira
- `'constraint'` - Technical/business constraints

**content**: Plain text description (must be understandable in isolation)

**raw_data examples**:

```json
// API endpoint evidence
{
  "method": "POST",
  "path": "/api/auth/login",
  "request_schema": {
    "email": "string",
    "password": "string"
  },
  "response_schema": {
    "token": "string",
    "user": {}
  },
  "auth": "none"
}

// UI element evidence
{
  "element_type": "button",
  "label": "Sign In",
  "position": "bottom-center",
  "state": "primary"
}

// Jira ticket evidence
{
  "ticket_key": "PROJ-123",
  "ticket_type": "Story",
  "status": "Done",
  "priority": "High"
}
```

---

### 2.3 features

**Purpose**: Inferred user-facing capabilities

```sql
CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  status TEXT DEFAULT 'candidate',
  inferred_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  metadata JSONB
);

CREATE INDEX idx_features_status ON features(status);
CREATE INDEX idx_features_confidence ON features(confidence_score DESC);
CREATE INDEX idx_features_inferred_at ON features(inferred_at DESC);

ALTER TABLE features ADD CONSTRAINT check_status
  CHECK (status IN ('candidate', 'confirmed', 'rejected'));
```

**status values**:
- `'candidate'` - Inferred, needs review (0.5 ≤ confidence < 0.75)
- `'confirmed'` - User confirmed (confidence ≥ 0.75 or manually approved)
- `'rejected'` - False positive, discarded

**metadata structure**:
```json
{
  "parent_feature_id": "uuid",  // For hierarchical features
  "tags": ["authentication", "critical"],
  "notes": "User notes from review",
  "merged_from": ["uuid1", "uuid2"]  // Duplicate features merged
}
```

---

### 2.4 processing_jobs

**Purpose**: Persistent queue for zero data loss

```sql
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  job_type TEXT DEFAULT 'extract',  -- 'extract', 'embed', 'infer'
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_document ON processing_jobs(document_id);
CREATE INDEX idx_processing_jobs_created ON processing_jobs(created_at DESC);

ALTER TABLE processing_jobs ADD CONSTRAINT check_status
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
```

**Status lifecycle**:
- `pending` → `processing` → `completed` OR `failed`
- On app restart: Resume `pending` and `processing` jobs
- Failed jobs: Retry up to max_retries

---

### 2.6 feature_outputs

**Purpose**: Graph relationships between features and evidence

```sql
CREATE TABLE feature_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  strength NUMERIC(3,2) CHECK (strength BETWEEN 0 AND 1),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_id, evidence_id)
);

CREATE INDEX idx_feature_evidence_feature ON feature_evidence(feature_id);
CREATE INDEX idx_feature_evidence_evidence ON feature_evidence(evidence_id);
CREATE INDEX idx_feature_evidence_strength ON feature_evidence(strength DESC);

ALTER TABLE feature_evidence ADD CONSTRAINT check_relationship_type
  CHECK (relationship_type IN ('implements', 'supports', 'constrains', 'extends'));
```

**relationship_type values**:
- `'implements'` - Evidence directly implements this feature (e.g., login button implements login)
- `'supports'` - Evidence supports or enables this feature (e.g., session API supports login)
- `'constrains'` - Evidence constrains how feature works (e.g., "password must be 8+ chars")
- `'extends'` - Evidence extends/enhances feature (e.g., "remember me" extends login)

**strength**: 0-1 score of how strongly evidence relates to feature

**reasoning**: LLM-generated explanation of the relationship

---

### 2.5 feature_outputs

**Purpose**: Generated artifacts for export

```sql
CREATE TABLE feature_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_feature_outputs_feature ON feature_outputs(feature_id);
CREATE INDEX idx_feature_outputs_type ON feature_outputs(output_type);
CREATE INDEX idx_feature_outputs_generated_at ON feature_outputs(generated_at DESC);

ALTER TABLE feature_outputs ADD CONSTRAINT check_output_type
  CHECK (output_type IN ('epic', 'story', 'acceptance_criteria', 'api_contract', 'requirements'));
```

**output_type values**:
- `'epic'` - Jira epic format
- `'story'` - User stories
- `'acceptance_criteria'` - Testable criteria
- `'api_contract'` - Platform-agnostic API specification
- `'requirements'` - Consolidated requirements doc

**content examples**:

```json
// Epic
{
  "title": "User Login",
  "description": "Enable users to authenticate with email/password",
  "acceptance_criteria": [...],
  "api_contracts": [...],
  "stories": [...]
}

// API Contract
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/auth/login",
      "request": {
        "body": {
          "email": { "type": "string", "format": "email", "required": true },
          "password": { "type": "string", "minLength": 8, "required": true }
        }
      },
      "response": {
        "200": { "token": "string", "user": "object" },
        "401": { "error": "Invalid credentials" }
      }
    }
  ]
}
```

---

## 3. Drizzle ORM Schema

```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, numeric, vector, integer } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  filePath: text('file_path').notNull(),
  fileHash: text('file_hash').unique().notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  metadata: jsonb('metadata'),
});

export const evidence = pgTable('evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: text('content').notNull(),
  rawData: jsonb('raw_data'),
  embedding: vector('embedding', { dimensions: 3072 }),
  extractedAt: timestamp('extracted_at').defaultNow(),
});

export const features = pgTable('features', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
  status: text('status').default('candidate'),
  inferredAt: timestamp('inferred_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: text('reviewed_by'),
  metadata: jsonb('metadata'),
});

export const featureEvidence = pgTable('feature_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  featureId: uuid('feature_id').references(() => features.id, { onDelete: 'cascade' }),
  evidenceId: uuid('evidence_id').references(() => evidence.id, { onDelete: 'cascade' }),
  relationshipType: text('relationship_type').notNull(),
  strength: numeric('strength', { precision: 3, scale: 2 }),
  reasoning: text('reasoning'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const featureOutputs = pgTable('feature_outputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  featureId: uuid('feature_id').references(() => features.id, { onDelete: 'cascade' }),
  outputType: text('output_type').notNull(),
  content: jsonb('content').notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
  version: integer('version').default(1),
});
```

---

## 4. Common Queries

### 4.1 Get all evidence for a feature

```sql
SELECT e.*
FROM evidence e
JOIN feature_evidence fe ON fe.evidence_id = e.id
WHERE fe.feature_id = $1
ORDER BY fe.strength DESC;
```

### 4.2 Find similar evidence (vector search)

```sql
SELECT id, content, 1 - (embedding <=> $1) as similarity
FROM evidence
WHERE 1 - (embedding <=> $1) > 0.7
ORDER BY embedding <=> $1
LIMIT 10;
```

### 4.3 Get features with confidence > threshold

```sql
SELECT *
FROM features
WHERE confidence_score >= 0.75
  AND status = 'candidate'
ORDER BY confidence_score DESC;
```

### 4.4 Feature with all related data (join)

```sql
SELECT
  f.*,
  json_agg(DISTINCT jsonb_build_object(
    'evidence_id', e.id,
    'type', e.type,
    'content', e.content,
    'relationship', fe.relationship_type,
    'strength', fe.strength
  )) as evidence_list
FROM features f
LEFT JOIN feature_evidence fe ON fe.feature_id = f.id
LEFT JOIN evidence e ON e.id = fe.evidence_id
WHERE f.id = $1
GROUP BY f.id;
```

---

## 5. Migrations

### 5.1 Initial Migration

```sql
-- drizzle/migrations/0000_initial.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Tables created in order (documents → evidence → features → feature_evidence → feature_outputs)
-- (See full SQL above)
```

### 5.2 Migration Strategy

- Use `drizzle-kit generate` to create migrations
- Review generated SQL before applying
- Test migrations on local DB first
- Keep migrations idempotent (use IF NOT EXISTS)

---

## 6. Data Integrity Rules

### 6.1 Cascading Deletes

- Delete document → cascade deletes all its evidence
- Delete feature → cascade deletes all feature_evidence links and outputs
- Delete evidence → cascade deletes feature_evidence links

### 6.2 Constraints

- `file_hash` must be unique (deduplication)
- `confidence_score` must be 0-1
- `strength` must be 0-1
- `status` must be valid enum value
- Feature-evidence pairs must be unique

### 6.3 Audit Trail

**Future enhancement**: Add audit table for feature changes

```sql
CREATE TABLE feature_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES features(id),
  action TEXT NOT NULL,  -- 'created', 'updated', 'confirmed', 'rejected', 'merged'
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB
);
```

---

## 7. Backup & Recovery

### 7.1 Backup Strategy

```bash
# Daily backups (Docker volume)
docker exec postgres pg_dump -U engine feature_engine > backup_$(date +%Y%m%d).sql

# With compression
docker exec postgres pg_dump -U engine feature_engine | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 7.2 Restore

```bash
# From backup file
cat backup_20241201.sql | docker exec -i postgres psql -U engine -d feature_engine

# From compressed
gunzip -c backup_20241201.sql.gz | docker exec -i postgres psql -U engine -d feature_engine
```

---

## 8. Performance Optimization

### 8.1 Indexes

All critical indexes included in schema above:
- Foreign keys indexed
- Frequently queried columns indexed
- Vector similarity index (ivfflat)
- Composite indexes for common queries (future)

### 8.2 Query Optimization

- Use `EXPLAIN ANALYZE` to profile slow queries
- Add covering indexes if needed
- Partition large tables (future: evidence table)
- Use materialized views for dashboards (future)

### 8.3 Connection Pooling

```typescript
// lib/db/client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
```
