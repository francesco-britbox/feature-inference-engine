# Additional Gaps - PM/BA Perspective
## Beyond Technical Implementation

> **Role**: Product Manager + Business Analyst Review
> **Purpose**: Identify gaps in user experience, edge cases, operational needs

---

## GAPS FOUND (PM/BA Lens)

### GAP 8: MIME TYPE VALIDATION MISSING ❌

**Risk**: User uploads .exe file renamed to .pdf

**Current**: Phase 1.1 validates file extension only

**Missing**: Actual MIME type verification

**Impact**: ❌ **SECURITY RISK** - Malicious files could be uploaded

**Fix required**:
```typescript
// Phase 1.1: Add MIME type validation
import { fileTypeFromBuffer } from 'file-type';

async function validateFile(file: File): Promise<void> {
  // 1. Check extension
  const ext = path.extname(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ValidationError('Invalid file extension');
  }

  // 2. Check actual MIME type (read file header)
  const buffer = await file.arrayBuffer();
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new ValidationError('File type mismatch - possible security risk');
  }

  // 3. Extension must match MIME type
  if (EXTENSION_MIME_MAP[ext] !== fileType.mime) {
    throw new ValidationError('File extension does not match content');
  }
}
```

**Add to Phase 1.1**:
- [ ] Install `file-type` package
- [ ] Validate actual MIME type (read file headers)
- [ ] Reject mismatched extension/MIME (security)

---

### GAP 9: NO BATCH SIZE LIMIT ❌

**Risk**: User uploads 1000 files at once → system crashes

**Current**: No batch size limit specified

**Impact**: ⚠️ **SYSTEM STABILITY** - Out of memory, overwhelmed

**Fix required**:
- Add to `.env.example`: `MAX_FILES_PER_BATCH=20`
- Add to Phase 1.1: Reject batches > 20 files
- Add to Phase 5.1: UI shows "Maximum 20 files per batch"

**User experience**:
- If user selects 25 files → show error: "Please select maximum 20 files at a time"
- Allow multiple batches (user can upload 20, then 20 more)

---

### GAP 10: NO TOTAL FILE SIZE LIMIT ❌

**Risk**: User uploads 20 x 50MB files = 1GB batch

**Current**: Per-file limit (50MB) but no batch total limit

**Impact**: ⚠️ **RESOURCE EXHAUSTION** - Disk/memory issues

**Fix required**:
- Add to `.env.example`: `MAX_BATCH_SIZE_MB=500` (total for all files)
- Add to Phase 1.1: Validate sum(file sizes) < 500MB
- Add to Phase 5.1: Show total size before upload

---

### GAP 11: NO PROGRESS VISIBILITY DURING EXTRACTION ❌

**Risk**: User uploads PDF → waits 5 minutes → no feedback

**Current**: Phase 5.1 mentions "progress indicators" but not real-time

**Impact**: ⚠️ **BAD UX** - User thinks system is frozen

**Fix required**:
- Add to Phase 1: WebSocket or polling endpoint for progress
- `/api/documents/:id/status` endpoint (GET)
- Phase 5.1: Poll status every 2 seconds, show progress

**Progress states**:
```typescript
{
  documentId: 'uuid',
  status: 'processing',
  progress: {
    stage: 'extraction',  // 'upload', 'extraction', 'embedding', 'inference'
    percent: 45,
    message: 'Extracting evidence from PDF (page 12/25)'
  }
}
```

---

### GAP 12: NO EXTRACTION TIMEOUT ❌

**Risk**: Extraction hangs forever (bad PDF, API timeout)

**Current**: No timeout specified

**Impact**: ⚠️ **RESOURCE LEAK** - Jobs stuck in 'processing'

**Fix required**:
- Add to `.env.example`: `EXTRACTION_TIMEOUT_MS=60000` (60 seconds)
- Add to Phase 1.2: Timeout mechanism
```typescript
const timeout = setTimeout(() => {
  job.status = 'failed';
  job.error_message = 'Extraction timeout after 60s';
}, EXTRACTION_TIMEOUT_MS);

try {
  await extractEvidence(document);
  clearTimeout(timeout);
} catch (error) {
  // Handle error
}
```

---

### GAP 13: NO FAILED JOB HANDLING ❌

**Risk**: Job fails 3 times → what happens? Stuck forever?

**Current**: Phase 1.2 mentions retry_count and max_retries

**Missing**: What happens after max retries exceeded?

**Fix required**:
- Add to Phase 1.2:
```
- [ ] After max_retries exceeded:
  - Mark job as 'failed' permanently
  - Update document.status to 'failed'
  - Store error message
  - DO NOT retry again
  - User must manually re-upload or fix document
```

---

### GAP 14: NO PARTIAL SUCCESS HANDLING ❌

**Risk**: Batch of 10 files → 8 succeed, 2 fail → what happens?

**Current**: Phase 1.1 says "all-or-nothing transaction"

**PM question**: Is this desired UX?

**Analysis**:
- **All-or-nothing**: If 1 file bad → entire batch fails
  - **Pro**: Atomic, clear state
  - **Con**: User loses 8 successful uploads

- **Partial success**: Save successful files, report failures
  - **Pro**: User doesn't lose work
  - **Con**: Inconsistent state, user must handle failures

**Recommendation**: ✅ **PARTIAL SUCCESS** for better UX

**Fix required**:
- Change Phase 1.1: Remove "all-or-nothing"
- Add per-file transaction (each file atomically saved or rolled back)
- Return: `{ successes: [id1, id2], failures: [{ filename, error }] }`
- User sees: "8 files uploaded successfully, 2 failed (see errors below)"

---

### GAP 15: NO DUPLICATE HANDLING UX ❌

**Risk**: User uploads same file twice → silently rejected?

**Current**: Phase 1.1 says "Check for duplicate hash"

**Missing**: What does user see?

**Fix required**:
- Add to Phase 1.1: Return duplicate status
```typescript
{
  status: 'duplicate',
  message: 'File already uploaded on 2024-01-15',
  existing_document_id: 'uuid',
  link: '/documents/uuid'
}
```
- Phase 5.1: Show warning: "File already uploaded - view existing"

---

### GAP 16: NO CONCURRENT UPLOAD HANDLING ❌

**Risk**: User clicks upload twice → duplicate jobs created

**Current**: No concurrency control

**Impact**: ⚠️ **DATA DUPLICATION** - Same evidence extracted twice

**Fix required**:
- Add to Phase 1.1: Check if file hash already has pending/processing job
```sql
SELECT * FROM processing_jobs pj
JOIN documents d ON d.id = pj.document_id
WHERE d.file_hash = $1
  AND pj.status IN ('pending', 'processing');
```
- If exists: Return 409 Conflict "File is currently being processed"

---

### GAP 17: NO EVIDENCE DEDUPLICATION ❌

**Risk**: Upload same PDF twice (different filenames) → duplicate evidence

**Current**: Document deduplication by hash, but evidence could duplicate

**Impact**: ⚠️ **DATA QUALITY** - Same requirements extracted twice

**Fix required**:
- Add to Phase 2: Evidence content hashing
- Before inserting evidence, check for similar content (embedding distance < 0.05)
- If duplicate: Link to existing evidence instead of creating new

---

### GAP 18: NO EXTRACTION FAILURE PARTIAL RECOVERY ❌

**Risk**: PDF with 100 pages → extraction fails on page 50 → lose all work

**Current**: "Partial extraction → flag" (mentioned) but not implemented

**Impact**: ⚠️ **EFFICIENCY** - User must re-upload entire document

**Fix required**:
- Add to Phase 2.4: Checkpoint mechanism
```typescript
async function extractFromPdf(document: Document): Promise<Evidence[]> {
  const allEvidence: Evidence[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const evidence = await extractFromPage(pageNum);
      allEvidence.push(...evidence);

      // Save checkpoint every 10 pages
      if (pageNum % 10 === 0) {
        await saveEvidenceCheckpoint(document.id, allEvidence);
      }
    } catch (error) {
      // Log error, continue with next page
      console.error(`Failed to extract page ${pageNum}`, error);
      continue;  // Don't fail entire document
    }
  }

  return allEvidence;
}
```

---

### GAP 19: NO TEST FIXTURES MANDATORY ❌

**Current**: Phase 0.2 says "Seed test data (optional)"

**Impact**: ❌ **CANNOT TEST** - No sample documents to verify system

**Fix required**:
- Change Phase 0.2: Make test fixtures **MANDATORY**
- Create `/tests/fixtures/` with samples:
  - `login-screenshot.png`
  - `api-spec.json`
  - `jira-export.csv`
  - `requirements.pdf`
  - `architecture.md`
- All implementation phases must test with these fixtures

---

### GAP 20: NO USER NOTIFICATION SYSTEM ❌

**Risk**: Processing takes 10 minutes → user closes browser → no notification

**Current**: No notification mechanism

**Impact**: ⚠️ **BAD UX** - User doesn't know when processing completes

**Fix required** (Future - Phase 9):
- Email notification when processing completes
- Browser notification API
- Polling endpoint for status

**For MVP**: User must keep browser open (document this limitation)

---

### GAP 21: NO ROLLBACK MECHANISM FOR INFERENCE ❌

**Risk**: Bad inference creates 100 wrong features → how to undo?

**Current**: No rollback for inference phase

**Impact**: ⚠️ **DATA QUALITY** - Stuck with bad features

**Fix required**:
- Add to Phase 4: Inference batch tracking
```sql
CREATE TABLE inference_runs (
  id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  document_ids UUID[],  -- Which documents were processed
  features_created UUID[],  -- Which features were inferred
  status TEXT
);
```
- Add UI action: "Undo last inference" → delete all features from that run

---

### GAP 22: NO FEATURE MERGE PREVIEW ❌

**Risk**: User merges "Login" and "Authentication" → loses data

**Current**: Phase 5.4 mentions "Merge with another feature"

**Missing**: Preview of what will happen

**Fix required**:
- Add to Phase 5.4: Merge preview
```typescript
{
  action: 'merge',
  from: { id, name, evidence_count },
  to: { id, name, evidence_count },
  result: {
    name: 'Authentication (merged)',  // User can edit
    total_evidence: 25,
    conflicts: 2  // Evidence linked to both
  }
}
```
- User must confirm before merge executes

---

### GAP 23: NO DATA RETENTION POLICY ❌

**Risk**: Documents accumulate forever → disk full

**Current**: No cleanup mechanism

**Impact**: ⚠️ **OPERATIONS** - Manual cleanup needed

**Fix required** (Phase 9):
- Add retention policy
```sql
ALTER TABLE documents ADD COLUMN delete_after TIMESTAMPTZ;

-- Auto-cleanup job (cron)
DELETE FROM documents
WHERE delete_after IS NOT NULL
  AND delete_after < NOW();
```
- Default: Keep forever (no auto-delete)
- User can set retention per document

---

### GAP 24: NO CONCURRENT PROCESSING LIMIT ❌

**Risk**: 100 pending jobs → all start processing simultaneously → crash

**Current**: "Process jobs sequentially" but no enforcement

**Impact**: ⚠️ **RESOURCE EXHAUSTION**

**Fix required**:
- Add to Phase 1.2: Concurrency limit
```typescript
// QueueService.ts
private readonly MAX_CONCURRENT_JOBS = 3;

async processQueue() {
  const runningJobs = await this.getRunningJobsCount();

  if (runningJobs >= this.MAX_CONCURRENT_JOBS) {
    return;  // Wait for jobs to complete
  }

  const job = await this.getNextPendingJob();
  await this.processJob(job);
}
```

---

### GAP 25: NO HEALTH CHECK ENDPOINTS ❌

**Risk**: System looks up but database is down

**Current**: Docker healthcheck for postgres/chroma, but not app

**Impact**: ⚠️ **OPERATIONS** - Cannot monitor system health

**Fix required**:
- Add to Phase 0: Health check endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabaseConnection(),
    chroma: await checkChromaConnection(),
    openai: await checkOpenAIApiKey(),
    disk: await checkDiskSpace(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return NextResponse.json(
    { healthy, checks },
    { status: healthy ? 200 : 503 }
  );
}
```

---

### GAP 26: NO VALIDATION ERROR DETAILS ❌

**Risk**: File rejected → user sees "Invalid file" → no details

**Current**: Error handling mentions codes, but not user-friendly messages

**Impact**: ⚠️ **BAD UX** - User doesn't know how to fix

**Fix required**:
- Add to Phase 1.1: Detailed validation errors
```typescript
// Bad
throw new Error('Invalid file');

// Good
throw new ValidationError({
  code: 'INVALID_FILE_TYPE',
  message: 'File type not supported',
  details: {
    provided: 'application/x-msdownload',
    allowed: ['application/pdf', 'image/png', 'image/jpeg', ...]
  },
  userMessage: 'Please upload PDF, PNG, JPG, JSON, CSV, YAML, or Markdown files only'
});
```

---

### GAP 27: NO EXTRACTION COST ESTIMATION ❌

**Risk**: User uploads 50 PDFs → $100 OpenAI bill

**Current**: No cost tracking or warnings

**Impact**: ⚠️ **COST CONTROL** - Unexpected bills

**Fix required** (Phase 9):
- Track API usage per document
```sql
ALTER TABLE documents ADD COLUMN extraction_cost_usd NUMERIC(10,4);
```
- Show estimate before processing: "Est. cost: $2.50 for 10 documents"
- Add budget limit in settings

---

### GAP 28: NO SEARCH/FILTER IN EVIDENCE EXPLORER ❌

**Risk**: 1000 evidence items → user can't find specific one

**Current**: Phase 5.2 mentions "Filter by type, document, date"

**Missing**: Text search within evidence content

**Fix required**:
- Add to Phase 5.2: Full-text search
```sql
-- Add to evidence table
ALTER TABLE evidence ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_evidence_search ON evidence USING GIN(search_vector);
```
- UI: Search box with real-time filtering

---

### GAP 29: NO FEATURE NAME COLLISION HANDLING ❌

**Risk**: Two features both named "Login" → which is which?

**Current**: Phase 4.3 mentions "Merge duplicates"

**Missing**: What if user wants to keep both (e.g., "User Login" vs "Admin Login")?

**Fix required**:
- Add to Phase 4.3: Smart merge suggestions
```typescript
if (feature1.name === feature2.name) {
  // Check if evidence contexts differ
  const contexts = await analyzeContexts(feature1, feature2);

  if (contexts.different) {
    // Suggest rename instead of merge
    return {
      action: 'rename',
      suggestions: [
        `${feature1.name} (${contexts.feature1})`,  // "Login (User)"
        `${feature2.name} (${contexts.feature2})`   // "Login (Admin)"
      ]
    };
  } else {
    // Suggest merge
    return { action: 'merge' };
  }
}
```

---

### GAP 30: NO EXPORT FORMAT VALIDATION ❌

**Risk**: Generated JSON doesn't import into Jira → user frustrated

**Current**: Phase 7.3 says "Jira-importable format"

**Missing**: Validation against actual Jira schema

**Fix required**:
- Add to Phase 7: Jira schema validation
```typescript
import jiraSchema from './jira-import-schema.json';
import Ajv from 'ajv';

const ajv = new Ajv();
const validate = ajv.compile(jiraSchema);

function validateJiraExport(data: unknown): void {
  if (!validate(data)) {
    throw new ValidationError('Export does not match Jira import format', {
      errors: validate.errors
    });
  }
}
```
- Include sample Jira import in test fixtures

---

### GAP 31: NO UNDO/HISTORY FOR USER ACTIONS ❌

**Risk**: User accidentally confirms wrong feature → cannot undo

**Current**: No history tracking for user actions

**Impact**: ⚠️ **DATA LOSS** - User mistakes are permanent

**Fix required** (Phase 9):
- Feature audit table (already mentioned in schema doc as "future")
- Make it MANDATORY:
```sql
CREATE TABLE feature_audit (
  id UUID PRIMARY KEY,
  feature_id UUID REFERENCES features(id),
  action TEXT NOT NULL,  -- 'created', 'confirmed', 'rejected', 'merged', 'renamed'
  user_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  old_state JSONB,
  new_state JSONB
);
```
- UI: "Undo last action" button (past 24 hours)

---

### GAP 32: NO FEATURE PRIORITY/IMPORTANCE ❌

**Risk**: User has 50 features → which to implement first?

**Current**: Only confidence score

**Missing**: User cannot set priority

**Fix required**:
- Add to features table:
```sql
ALTER TABLE features ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE features ADD COLUMN business_value INTEGER;
-- 'critical', 'high', 'medium', 'low'
```
- Phase 5: User can set priority + business value
- Phase 7: Export ordered by priority

---

### GAP 33: NO BULK OPERATIONS ❌

**Risk**: User wants to confirm 20 features → must click 20 times

**Current**: No bulk actions mentioned

**Impact**: ⚠️ **BAD UX** - Tedious

**Fix required**:
- Add to Phase 5.3: Bulk actions
  - Select multiple features (checkboxes)
  - "Confirm selected" (bulk confirm)
  - "Reject selected" (bulk reject)
  - "Export selected" (bulk export)

---

### GAP 34: NO EVIDENCE SOURCE TRACKING ❌

**Risk**: Evidence says "Email input required" → from which document?

**Current**: `evidence.document_id` tracks source document

**Missing**: If document is deleted, evidence has broken link

**Fix required**: Already handled by CASCADE DELETE in schema ✅

**BUT**: What if user needs to see original screenshot that produced evidence?

**Additional fix**:
- Add to Phase 5.2: "View source document" button next to each evidence
- Show original screenshot/PDF page where evidence came from

---

### GAP 35: NO OPENAI API KEY VALIDATION ❌

**Risk**: User starts app with invalid API key → all extractions fail

**Current**: No validation on startup

**Impact**: ⚠️ **BAD UX** - Failures only appear during processing

**Fix required**:
- Add to Phase 0.1: Validate API key on startup
```typescript
// app/startup.ts
async function validateEnvironment() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  // Test API key with simple call
  try {
    await openai.models.list();
  } catch (error) {
    throw new Error('Invalid OPENAI_API_KEY - API call failed');
  }
}
```

---

### GAP 36: NO RATE LIMIT HANDLING FOR BATCH UPLOADS ❌

**Risk**: User uploads 50 images → 50 OpenAI Vision calls → rate limit hit

**Current**: Phase 2.1 mentions "Handle API errors (retry logic)"

**Missing**: Proactive rate limiting (don't hit limit in first place)

**Fix required**:
- Add to Phase 2: Rate limiter
```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  minTime: 1200,  // 50 requests per minute = 1 per 1.2 seconds
  maxConcurrent: 5
});

const rateLimitedVisionCall = limiter.wrap(
  (image: string) => openai.chat.completions.create({ /* ... */ })
);
```

---

### GAP 37: NO EVIDENCE CONFIDENCE SCORE ❌

**Risk**: Screenshot extraction hallucinates → bad evidence accepted

**Current**: Features have confidence, evidence doesn't

**Missing**: Evidence quality score

**Fix required**:
- Add to evidence table:
```sql
ALTER TABLE evidence ADD COLUMN confidence NUMERIC(3,2);
```
- Phase 2: LLM returns confidence per evidence item
- Low confidence evidence (<0.5) flagged for review

---

### GAP 38: NO FEATURE COMPLETENESS INDICATOR ❌

**Risk**: Feature has only 1 evidence item → incomplete but looks ready

**Current**: No completeness metric

**Missing**: User doesn't know if feature has enough evidence

**Fix required**:
- Add to Phase 6: Completeness score
```typescript
function calculateCompleteness(feature: Feature, evidence: Evidence[]): number {
  const requiredTypes = ['ui_element', 'endpoint', 'requirement'];
  const hasTypes = [...new Set(evidence.map(e => e.type))];

  const coverage = requiredTypes.filter(t => hasTypes.includes(t)).length / requiredTypes.length;

  return coverage;  // 0-1 score
}
```
- Phase 5.4: Show "Completeness: 66% - Missing API endpoints"

---

### GAP 39: NO EXTRACTION PREVIEW ❌

**Risk**: User uploads doc → bad extraction → wastes inference tokens

**Current**: Extraction automatically triggers inference

**Missing**: User cannot review evidence before inference

**Fix required**:
- Add to Phase 1: Two-stage processing
  1. Upload → Extract → STOP (show evidence)
  2. User reviews evidence → clicks "Run Inference"
- Phase 5.2: "Run inference for these documents" button

---

### GAP 40: NO API CONTRACT VALIDATION ❌

**Risk**: Generated API contract has invalid JSON schema

**Current**: Phase 6.2 says "Validate completeness" but not schema validity

**Impact**: ⚠️ **OUTPUT QUALITY** - Bad contracts exported

**Fix required**:
- Add to Phase 6.2: JSON Schema validation
```typescript
import Ajv from 'ajv';

const contractSchema = {
  type: 'object',
  required: ['endpoint', 'method', 'request', 'response'],
  properties: {
    method: { enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    // ... full schema
  }
};

const ajv = new Ajv();
const validate = ajv.compile(contractSchema);

if (!validate(apiContract)) {
  throw new ValidationError('Invalid API contract', validate.errors);
}
```

---

## SUMMARY OF ALL GAPS (1-40)

### CRITICAL (Must Fix for MVP)
- [x] GAP 1: Batch upload ✅ FIXED
- [x] GAP 2: Status field ✅ FIXED
- [x] GAP 5: Zero data loss ✅ FIXED
- [ ] GAP 8: MIME type validation ❌
- [ ] GAP 9: Batch size limit ❌
- [ ] GAP 10: Total size limit ❌
- [ ] GAP 13: Failed job handling ❌
- [ ] GAP 14: Partial success handling ❌
- [ ] GAP 19: Test fixtures mandatory ❌
- [ ] GAP 35: API key validation ❌

### HIGH PRIORITY (Should Fix for MVP)
- [x] GAP 3: Pub/sub assessment ✅ FIXED
- [x] GAP 4: State store explicit ✅ FIXED
- [ ] GAP 11: Progress visibility ❌
- [ ] GAP 12: Extraction timeout ❌
- [ ] GAP 15: Duplicate handling UX ❌
- [ ] GAP 16: Concurrent upload handling ❌
- [ ] GAP 26: Validation error details ❌
- [ ] GAP 36: Rate limit handling ❌

### MEDIUM PRIORITY (Nice to Have)
- [ ] GAP 17: Evidence deduplication
- [ ] GAP 18: Partial extraction recovery
- [ ] GAP 20: User notifications
- [ ] GAP 27: Cost estimation
- [ ] GAP 28: Evidence search
- [ ] GAP 37: Evidence confidence
- [ ] GAP 38: Feature completeness
- [ ] GAP 39: Extraction preview

### LOW PRIORITY (Future / Phase 9+)
- [ ] GAP 21: Inference rollback
- [ ] GAP 22: Merge preview
- [ ] GAP 23: Data retention
- [ ] GAP 24: Concurrent processing limit
- [ ] GAP 29: Feature name collision
- [ ] GAP 31: Undo/history
- [ ] GAP 32: Feature priority
- [ ] GAP 33: Bulk operations
- [ ] GAP 40: Contract validation

---

## VERDICT AFTER FIXES

**Critical gaps fixed**: 3/5 (batch upload, status, state store)
**Remaining critical gaps**: 7

**Is plan now implementable?** ⚠️ **PARTIALLY - MORE FIXES NEEDED**

**Will app work at end of Phase 7?** ⚠️ **YES, BUT WITH ISSUES**:
- Can batch upload ✅
- Can track status ✅
- Zero data loss ✅
- But: No MIME validation (security risk)
- But: No batch limits (stability risk)
- But: No proper error messages (UX issue)

**I am continuing to fix critical gaps now...**
