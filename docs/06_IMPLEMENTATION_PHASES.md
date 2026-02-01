# Implementation Phases
## Token-Friendly Breakdown with Dependencies

---

## Phase Dependencies Map

```
Phase 0 (Foundation)
    ↓
Phase 1 (Ingestion)
    ↓
Phase 2 (Extraction) ←→ Phase 3 (Embeddings) [can overlap]
    ↓
Phase 4 (Inference) [sequential internal steps]
    ↓
Phase 5 (UI) [parallel pages]
    ↓
Phase 6 (Assembly) [parallel generators after 6.1]
    ↓
Phase 7 (Tickets) ← MVP COMPLETE - APP WORKS
    ↓
Phase 8 (Incremental) [updates/changes]
    ↓
Phase 9 (Enrichment) [OPTIONAL - platform guidelines, legal, edge cases]
```

---

## Phase 0: Foundation
**Duration**: Week 1
**Dependencies**: None
**Parallelization**: All tasks can run simultaneously

### Tasks

#### 0.1 Project Scaffolding
- [ ] Initialize Next.js 15 with TypeScript
  ```bash
  pnpm create next-app@latest feature-inference-engine \
    --typescript --tailwind --app --src-dir false
  ```
- [ ] Setup Docker Compose files
  - `docker-compose.yml` (postgres, chroma, app)
  - `Dockerfile` for app
- [ ] **Copy `.env.example` to project root** (already exists)
- [ ] Create `.env.local` from template
  - Add your OPENAI_API_KEY
  - Configure database password
- [ ] Create base folder structure
  ```
  /app, /lib, /components, /docs, /tests, /drizzle
  ```
- [ ] **Create health check endpoint**: `/app/api/health/route.ts`
  - Check database connection
  - Check Chroma connection
  - Validate OpenAI API key
  - Check disk space
  - Return 200 if all OK, 503 if any fail
- [ ] Install core dependencies
  ```bash
  pnpm add drizzle-orm pg @neondatabase/serverless
  pnpm add openai chromadb file-type bottleneck
  pnpm add papaparse js-yaml pdf-parse
  pnpm add ml-dbscan ml-matrix
  pnpm add -D drizzle-kit @types/pg @types/papaparse
  ```
- [ ] **Validate OpenAI API key on first startup**:
  - Test API call to verify key is valid
  - Fail fast with clear error if invalid
- [ ] Create test fixtures (**MANDATORY**):
  - `/tests/fixtures/screenshots/login.png`
  - `/tests/fixtures/api-specs/postman-collection.json`
  - `/tests/fixtures/jira/tickets.csv`
  - `/tests/fixtures/docs/requirements.pdf`
  - `/tests/fixtures/docs/architecture.md`

#### 0.2 Database Setup
- [ ] Install Drizzle ORM and PostgreSQL driver
- [ ] Create `lib/db/schema.ts` with COMPLETE schema:
  - documents table (with status, error_message fields)
  - processing_jobs table (persistent queue)
  - evidence table (with embedding vector)
  - features table
  - feature_evidence table (graph)
  - feature_outputs table
- [ ] Setup Drizzle config (`drizzle.config.ts`)
- [ ] **Generate initial migration** (MANDATORY)
  ```bash
  pnpm drizzle-kit generate
  ```
- [ ] **Apply migration** to local database
  ```bash
  pnpm drizzle-kit push
  ```
- [ ] Create database client (`lib/db/client.ts`) with connection pooling
- [ ] **Seed test data** (**MANDATORY**, not optional):
  - 3 test documents in each format
  - 10-15 test evidence items
  - 2-3 test features with relationships
  - Use for integration tests

#### 0.3 Documentation Files
- [ ] Copy docs from planning phase
  - Architecture, Tech Stack, DB Schema, Coding Principles, Git Strategy
- [ ] Create README.md with setup instructions
- [ ] Initialize git repository
  ```bash
  git init
  git checkout -b develop
  ```
- [ ] Setup `.gitignore`

**Success Criteria**:
- Next.js dev server runs (`pnpm dev`)
- Docker containers start successfully
- Database migrations apply without errors
- TypeScript compiles without errors

---

## Phase 1: Ingestion Pipeline
**Duration**: Week 2
**Dependencies**: Phase 0 complete
**Parallelization**: 1.1 and 1.3 can be built together

### Tasks

#### 1.1 File Upload API (BATCH UPLOAD SUPPORT + VALIDATION)
- [ ] Create `/app/api/upload/route.ts`
- [ ] Handle `multipart/form-data` POST requests with **MULTIPLE FILES**
- [ ] **Batch limits**:
  - Max 20 files per batch (from env: `MAX_FILES_PER_BATCH`)
  - Max 500MB total batch size (from env: `MAX_BATCH_SIZE_MB`)
  - Reject if limits exceeded with clear error message
- [ ] For EACH file, validate:
  - **File extension**: PDF, PNG, JPG, JSON, CSV, YAML, MD
  - **File size**: Max 50MB per file
  - **MIME type**: Install `file-type` package, verify actual MIME matches extension
  - **Security**: Reject if extension/MIME mismatch (e.g., .exe renamed to .pdf)
  - **Duplicate check**: Calculate hash (SHA-256), check if exists in DB
  - **Concurrent processing**: Check if hash already has pending/processing job
- [ ] **Implement PER-FILE transaction** (partial success allowed):
  1. For each file individually:
     - Start transaction
     - Save to disk: `/app/docs/<document-id>/original.<ext>`
     - Insert document record
     - Create processing_job record (status='pending')
     - Commit transaction
  2. If file fails: Rollback that file only, continue with others
  3. Return: `{ successes: [{id, filename}], failures: [{filename, error, details}] }`
- [ ] **Validate OpenAI API key** before accepting uploads (fail fast)
- [ ] **Detailed error messages** for validation failures
- [ ] **ZERO DATA LOSS per file**: Each file atomically saved or rolled back

#### 1.2 Document Processing Queue (PERSISTENT - ZERO DATA LOSS)
- [ ] Create `lib/services/QueueService.ts` (DATABASE-BACKED, not in-memory)
- [ ] Use `processing_jobs` table as persistent queue
- [ ] Job creation:
  - Insert record with status='pending'
  - Link to document via document_id
- [ ] Job processing with timeout and retry:
  - Fetch oldest pending job: `SELECT * FROM processing_jobs WHERE status='pending' ORDER BY created_at LIMIT 1`
  - Update status to 'processing' + set started_at
  - **Set timeout**: 60 seconds (from env: `EXTRACTION_TIMEOUT_MS`)
  - Execute extraction with timeout wrapper
  - If timeout: Mark as 'failed' with error "Extraction timeout"
  - If error: Mark as 'failed', store error_message
  - If success: Mark as 'completed' + set completed_at
  - **Retry logic**: If failed and retry_count < max_retries:
    - Increment retry_count
    - Reset status to 'pending'
    - Will be picked up in next queue cycle
  - **Max retries exceeded**: Keep as 'failed', do NOT retry
- [ ] **On app startup**: Resume all 'pending' and 'processing' jobs
- [ ] **Concurrency limit**: Max 3 jobs processing simultaneously
- [ ] **ZERO DATA LOSS**: Queue state persisted to database
- [ ] Update document.status throughout lifecycle

#### 1.3 Storage Service
- [ ] Create `lib/services/StorageService.ts`
- [ ] Save uploaded files to `/app/docs/<document-id>/original.<ext>`
- [ ] Store metadata in `documents` table
- [ ] Return document ID and file path
- [ ] Handle file system errors gracefully

#### 1.4 Status API
- [ ] Create `/app/api/documents/[id]/status/route.ts`
- [ ] Return document processing status:
  ```typescript
  {
    documentId: string,
    filename: string,
    status: 'uploaded' | 'processing' | 'completed' | 'failed',
    progress: {
      stage: 'extraction' | 'embedding' | 'inference',
      message: string
    },
    error?: string,
    evidenceCount?: number
  }
  ```
- [ ] Enable polling from UI (called every 2 seconds)
- [ ] Query both documents and processing_jobs tables

**Success Criteria**:
- Upload **MULTIPLE files** via POST (up to 20 files, 500MB total)
- **Partial success**: If 8/10 succeed, return both successes and failures
- Successful files saved to `/app/docs/` with DB records
- Failed files rolled back individually (no orphaned data)
- Duplicate uploads detected and reported
- MIME type validated (security check)
- Processing jobs created for successful documents
- Queue processes extraction jobs with timeout (60s) and retry (3x)
- **ZERO DATA LOSS per file**: Each file transaction guarantees consistency

---

## Phase 2: Extraction Engine
**Duration**: Weeks 3-4
**Dependencies**: Phase 1 complete
**Parallelization**: 2.1, 2.2, 2.3, 2.4 can be built simultaneously; 2.5 waits for others

### Tasks

#### 2.1 Screenshot Extractor
- [ ] Create `lib/services/extractors/ScreenshotExtractor.ts`
- [ ] Integrate OpenAI Vision API
- [ ] **Install rate limiter**: `bottleneck` package
  - Limit: 50 requests per minute (OpenAI Vision limit)
  - Max concurrent: 5
- [ ] Create prompt template in `lib/prompts/extraction.ts`
- [ ] Parse JSON response → Evidence array
- [ ] Handle API errors:
  - Rate limit (429): Exponential backoff + retry
  - Timeout: Retry with longer timeout
  - Invalid response: Log error, return empty array
- [ ] Store evidence in `evidence` table
- [ ] Test with sample screenshots from `/tests/fixtures`

#### 2.2 API Spec Extractor
- [ ] Create `lib/services/extractors/ApiSpecExtractor.ts`
- [ ] Parse JSON (Postman collections)
- [ ] Parse YAML (OpenAPI specs)
- [ ] Extract endpoints, request/response schemas
- [ ] Map to evidence types (`endpoint`, `payload`)
- [ ] Store in `evidence` table
- [ ] Test with sample API specs

#### 2.3 Jira CSV Extractor
- [ ] Create `lib/services/extractors/JiraExtractor.ts`
- [ ] Use `papaparse` for CSV parsing
- [ ] Map columns: Summary → requirement, Description → detailed requirement
- [ ] Handle Type=Bug → bug evidence
- [ ] Store in `evidence` table
- [ ] Test with sample Jira exports

#### 2.4 PDF/Markdown Extractor
- [ ] Create `lib/services/extractors/PdfExtractor.ts`
- [ ] Use `pdf-parse` for text extraction
- [ ] Implement chunking (500 tokens per chunk)
- [ ] LLM-based requirement extraction
- [ ] Store in `evidence` table
- [ ] Test with sample requirement docs

#### 2.5 Extraction Orchestrator
- [ ] Create `lib/services/ExtractionService.ts`
- [ ] Route documents to correct extractor based on file type
- [ ] Batch processing logic
- [ ] Error handling (log, flag document, continue)
- [ ] Progress tracking (update document status)
- [ ] API endpoint: `POST /api/extract`

**Success Criteria**:
- Upload screenshot → extracts UI elements
- Upload API spec → extracts endpoints
- Upload Jira CSV → extracts tickets
- Upload PDF → extracts requirements
- All evidence stored in DB with correct types

---

## Phase 3: Embedding & Vector Store
**Duration**: Week 4 (overlaps with Phase 2)
**Dependencies**: Phase 2.1-2.4 (need evidence format defined)
**Parallelization**: Can build alongside Phase 2 extractors

### Tasks

#### 3.1 Chroma Client Setup
- [ ] Create `lib/ai/chroma.ts` client
- [ ] Connect to local Chroma instance (http://chroma:8000)
- [ ] Create collection: `evidence_embeddings`
- [ ] Configure collection metadata (cosine distance, 3072 dimensions)

#### 3.2 Embedding Service
- [ ] Create `lib/services/EmbeddingService.ts`
- [ ] Integrate OpenAI embeddings API (`text-embedding-3-large`)
- [ ] Batch embedding (100 items per request)
- [ ] Store embeddings in Chroma
- [ ] Also store in PostgreSQL `evidence.embedding` (pgvector)
- [ ] Handle API rate limits

#### 3.3 Vector Search
- [ ] Create similarity search function
- [ ] K-nearest neighbors retrieval (K=20)
- [ ] Return evidence IDs + similarity scores
- [ ] Test with sample queries

**Success Criteria**:
- Evidence embeddings generated and stored
- Similarity search returns relevant evidence
- Both Chroma and pgvector functional

---

## Phase 4: Feature Inference Engine
**Duration**: Weeks 5-6
**Dependencies**: Phase 3 complete
**Parallelization**: MUST be sequential (4.1 → 4.2 → 4.3 → 4.4 → 4.5)

### Tasks

#### 4.1 Clustering Service
- [ ] Create `lib/services/ClusteringService.ts`
- [ ] Implement DBSCAN clustering (`ml-dbscan`)
- [ ] Tune parameters (eps=0.3, min_samples=3)
- [ ] Return evidence clusters
- [ ] Handle edge cases (noise points, single-item clusters)

#### 4.2 Feature Hypothesis Generator
- [ ] Create `lib/services/FeatureInferenceService.ts`
- [ ] LLM prompt per cluster (see `lib/prompts/inference.ts`)
- [ ] Parse response: feature_name, confidence, reasoning
- [ ] Store in `features` table (status='candidate')
- [ ] Create initial `feature_evidence` links

#### 4.3 Cross-Cluster Validator
- [ ] Compare feature names across clusters
- [ ] LLM-based similarity check
- [ ] Merge duplicate features
- [ ] Update `feature_evidence` links
- [ ] Handle parent-child relationships

#### 4.4 Confidence Scorer
- [ ] Implement confidence formula:
  ```typescript
  confidence = 1 - signals.reduce((acc, s) => acc * (1 - s.weight), 1)
  ```
- [ ] Apply signal weights (endpoint: 0.4, ui_element: 0.3, etc.)
- [ ] Calculate per-feature scores
- [ ] Update `features.confidence_score`
- [ ] Set status based on thresholds (<0.5: discard, 0.5-0.75: candidate, >0.75: confirmed)

#### 4.5 Relationship Builder
- [ ] Assign relationship types (implements, supports, constrains, extends)
- [ ] Calculate relationship strength scores
- [ ] Update `feature_evidence` table
- [ ] Store LLM reasoning

**Success Criteria**:
- Upload 10 documents → infer 5+ features
- Features have confidence scores
- Evidence correctly linked to features
- Duplicate features merged

---

## Phase 5: Review UI
**Duration**: Week 7
**Dependencies**: Phase 4 complete
**Parallelization**: All pages can be built simultaneously

### Tasks

#### 5.1 Upload Page (BATCH/MULTIPLE FILE SUPPORT)
- [ ] Create `/app/upload/page.tsx`
- [ ] Implement drag-drop file upload (`react-dropzone` with `multiple: true`)
- [ ] **Support selecting MULTIPLE files at once** (Ctrl+click or drag multiple)
- [ ] **Batch limits shown**: "Select up to 20 files (max 500MB total)"
- [ ] **Show progress for EACH file individually**:
  - File name + size
  - Upload progress (0-100%)
  - Extraction status: uploaded → processing → complete/failed
  - Error details if failed
- [ ] **Poll status** every 2 seconds: `GET /api/documents/:id/status`
- [ ] Document list view (show ALL uploaded files with filters)
- [ ] Status badges per file with colors:
  - 🟡 uploaded (pending extraction)
  - 🔵 processing (extracting)
  - 🟢 complete (extraction done)
  - 🔴 failed (show error message)
- [ ] **Duplicate detection**: Show "File already uploaded - view existing"
- [ ] **Batch upload all selected files** in single API call
- [ ] **Show success/failure summary**: "8 uploaded, 2 failed (click to see errors)"

#### 5.2 Evidence Explorer
- [ ] Create `/app/evidence/page.tsx`
- [ ] Table view with pagination (`@tanstack/react-table`)
- [ ] Filters: by type, by document, by date
- [ ] Show evidence content + raw data
- [ ] Link to source document

#### 5.3 Feature Candidates Page
- [ ] Create `/app/features/page.tsx`
- [ ] List all features with confidence scores
- [ ] Visual confidence indicators (progress bars, badges)
- [ ] Actions: Merge, Reject, Confirm
- [ ] Filter by status (candidate, confirmed, rejected)

#### 5.4 Feature Detail View
- [ ] Create `/app/features/[id]/page.tsx`
- [ ] Use **Tabs component** (shadcn) for different views
- [ ] Show all linked evidence (grouped by type, collapsible)
- [ ] Display relationship graph (list with strength indicators)
- [ ] Edit feature name/description (Dialog component)
- [ ] Add/remove evidence links manually
- [ ] Merge with another feature (with confirmation)

#### 5.5 System Status Dashboard (NEW)
- [ ] Create `/app/status/page.tsx`
- [ ] Show system-wide stats:
  - Documents: total, processing, completed, failed
  - Evidence: count by type
  - Features: candidates, confirmed, avg confidence
  - Queue: pending jobs, processing jobs
- [ ] Use **Card components** (shadcn) for each metric
- [ ] Real-time updates (poll every 5 seconds)
- [ ] Link to queue view
- [ ] Show current processing jobs with progress

#### 5.6 Correlation Testing & Debug UI (NEW)
- [ ] Create `/app/debug/correlation/page.tsx`
- [ ] **Purpose**: Manually test feature inference
- [ ] Evidence selection:
  - Checkbox list of all evidence
  - Filter by type
  - Search by content
- [ ] "Test Correlation" button → calls inference API with selected evidence
- [ ] Show inference result:
  - Feature name (from LLM)
  - Confidence score
  - Reasoning
  - Relationships with strength
- [ ] "Create Feature" button → creates feature from test result
- [ ] "Adjust & Retry" button → modify selection and retest
- [ ] **Simple layout**: Single page, clear sections, no clutter

**Success Criteria**:
- Upload files through UI (multiple files at once)
- View all evidence in sortable/filterable table
- Review feature candidates with confidence indicators
- Confirm/reject/merge features
- Edit feature details
- **View system status at a glance**
- **Manually test correlation with any evidence combination**
- All UI uses shadcn/ui components
- All errors shown with clear user-friendly messages
- Simple labels with tooltips where needed
- Real-time progress for uploads and processing

---

## Phase 6: Knowledge Assembly
**Duration**: Week 8
**Dependencies**: Phase 5 complete (features confirmed)
**Parallelization**: 6.2, 6.3, 6.4 can run in parallel after 6.1

### Tasks

#### 6.1 Feature Assembler Service
- [ ] Create `lib/services/AssemblyService.ts`
- [ ] Collect all evidence for a feature
- [ ] Group by type:
  - UI evidence → UI requirements
  - Endpoint evidence → API contracts
  - Requirement evidence → functional requirements
  - Edge case evidence → acceptance criteria

#### 6.2 API Contract Generator (parallel after 6.1)
- [ ] Extract all endpoint evidence
- [ ] Synthesize into platform-agnostic contract
- [ ] Include: methods, paths, request/response schemas, auth, errors
- [ ] Validate completeness
- [ ] Store in `feature_outputs` (type='api_contract')

#### 6.3 Requirements Synthesizer (parallel after 6.1)
- [ ] Extract all requirement evidence
- [ ] Remove duplicates
- [ ] LLM: consolidate into coherent requirements doc
- [ ] Store in `feature_outputs` (type='requirements')

#### 6.4 Acceptance Criteria Generator (parallel after 6.1)
- [ ] Extract edge cases and acceptance criteria evidence
- [ ] Format as testable statements ("Given/When/Then")
- [ ] Store in `feature_outputs` (type='acceptance_criteria')

#### 6.5 Output Storage
- [ ] Store all outputs in `feature_outputs` table
- [ ] Version tracking (increment version on regeneration)
- [ ] Export formats: JSON, Markdown

**Success Criteria**:
- Feature → complete API contract
- Feature → consolidated requirements
- Feature → testable acceptance criteria
- All outputs stored in DB

---

## Phase 7: Ticket Generation
**Duration**: Week 9
**Dependencies**: Phase 6 complete
**Parallelization**: 7.1, 7.2 can be built together

### Tasks

#### 7.1 Epic Generator
- [ ] Create `lib/services/TicketService.ts`
- [ ] Map feature → Jira epic format
- [ ] Include: name, description, acceptance criteria, API contracts
- [ ] Platform-agnostic format (no Jira-specific fields)

#### 7.2 Story Generator
- [ ] Break feature into user stories
- [ ] Assign evidence to stories
- [ ] Generate story descriptions
- [ ] Link stories to epic

#### 7.3 Export Service
- [ ] JSON output (Jira-importable format)
- [ ] Markdown output (human-readable)
- [ ] CSV output (bulk import to Jira)
- [ ] API endpoint: `GET /api/features/:id/export?format=json|md|csv`

#### 7.4 Preview UI
- [ ] Create `/app/features/[id]/export/page.tsx`
- [ ] Show generated epic + stories
- [ ] Edit before export
- [ ] Download buttons (JSON, MD, CSV)
- [ ] Copy to clipboard

**Success Criteria**:
- Feature → Epic with stories
- Export to JSON (Jira-compatible)
- Export to Markdown
- Preview in UI before download

---

## Phase 8: Incremental Processing
**Duration**: Week 10
**Dependencies**: Phase 7 complete
**Parallelization**: Sequential (8.1 → 8.2 → 8.3)

### Tasks

#### 8.1 Change Detection
- [ ] Track document versions (add `version` field to documents table)
- [ ] Detect new files uploaded
- [ ] Detect modified files (hash comparison)
- [ ] Flag documents needing reprocessing

#### 8.2 Incremental Extraction
- [ ] Only process changed documents
- [ ] Soft-delete old evidence (mark as obsolete)
- [ ] Extract new evidence
- [ ] Update affected features

#### 8.3 Feature Re-inference
- [ ] Re-run inference on updated evidence
- [ ] Update confidence scores
- [ ] Merge new features with existing
- [ ] Notify user of changes

**Success Criteria**:
- Upload new document → only processes that document
- Update document → re-extracts evidence
- Feature confidence updates automatically

---

## Phase 9: External Enrichment (Enhancement)
**Duration**: Weeks 11-13 (3 weeks)
**Dependencies**: Phase 7 complete
**Type**: OPTIONAL - Run after MVP is working

> **IMPORTANT**: This is an enhancement phase. The app works without it.
> Run this after Phase 7 is complete and you've validated core functionality.

**See detailed implementation**: [docs/10_PHASE_9_ENRICHMENT_DETAILED.md](10_PHASE_9_ENRICHMENT_DETAILED.md)

### Summary Tasks

**Phase 9.1**: Enrichment Infrastructure (Week 11.1)
- [ ] Create enrichment services folder
- [ ] Add enrichment_sources table to schema
- [ ] Create enrichment API endpoint

**Phase 9.2**: Platform Guidelines (Week 11.2)
- [ ] Fetch iOS HIG (web scraping + LLM)
- [ ] Fetch Android Material Design
- [ ] Fetch Web standards
- [ ] Implement matching logic

**Phase 9.3**: Legal & Compliance (Week 11.3)
- [ ] GDPR requirements generation
- [ ] CCPA requirements
- [ ] App Store/Play Store certification
- [ ] Copyright and age restrictions

**Phase 9.4**: Accessibility & Security (Week 11.4)
- [ ] WCAG 2.1 AA requirements by feature type
- [ ] OWASP Top 10 security checks

**Phase 9.5**: Edge Case Generation (Week 11.5)
- [ ] Mine GitHub issues for common bugs
- [ ] Mine Stack Overflow for problems
- [ ] LLM: Generate known edge cases
- [ ] Prioritize edge cases

**Phase 9.6**: Enrichment UI (Week 11.6)
- [ ] Enrichment page per feature
- [ ] Show all enrichment sources
- [ ] Select which to add to acceptance criteria
- [ ] Re-generate tickets with enrichments

### Success Criteria

**For "Video Playback" feature, generates**:
- ✅ iOS video playback guidelines (5-10 items)
- ✅ Android video playback guidelines (5-10 items)
- ✅ Google Play video requirements (3-5 items)
- ✅ WCAG media accessibility (5-8 items)
- ✅ OWASP security for media (3-5 items)
- ✅ Legal compliance (copyright, age restrictions)
- ✅ Edge cases (10-15 scenarios with priority)

**All stored in database, selectable in UI, addable to tickets**

**For full implementation details, see**: `docs/10_PHASE_9_ENRICHMENT_DETAILED.md` (650 lines)

---

## Minimum Viable Product (MVP)

**Phases 0-5** = 7 weeks
Includes: Upload, extraction, inference, basic UI

**Full MVP (RECOMMENDED START HERE)**
**Phases 0-7** = 9 weeks
Includes: Full pipeline + ticket generation
**→ APP IS FULLY FUNCTIONAL - Can batch upload and generate tickets**

**With Incremental Updates**
**Phases 0-8** = 10 weeks
Includes: MVP + incremental processing (handle new uploads efficiently)

**With External Enrichment (Enhancement)**
**Phases 0-9** = 13 weeks
Includes: MVP + platform guidelines + legal + accessibility + edge cases
**→ Tickets include Apple/Android/legal/accessibility requirements**

**Enrichment is OPTIONAL** - App works without it (Phase 9 is enhancement only)

---

## Risk Mitigation Per Phase

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 2 | Extractor accuracy | Test with diverse documents |
| 3 | Embedding API rate limits | Batch requests, retry logic |
| 4 | Poor clustering | Tune DBSCAN params, manual fallback |
| 4 | LLM hallucinations | Confidence scoring, human review |
| 5 | UX complexity | Iterative design, user testing |
| 7 | Jira format compatibility | Validate with sample imports |

---

## Phase Completion Checklist Template

```markdown
## Phase X: [Name]

### Tasks Completed
- [x] Task 1
- [x] Task 2
- [ ] Task 3 (blocked by...)

### Tests Added
- Unit tests: [file paths]
- Integration tests: [file paths]

### Manual Testing
- [ ] Test scenario 1: [result]
- [ ] Test scenario 2: [result]

### Known Issues
- Issue #1: [description]
- Issue #2: [description]

### Ready for Next Phase
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Documented
- [ ] Merged to develop
```
