# Framework Quality Evaluation Protocol
## Comprehensive System Audit - Extraction, Inference, Graph, Tickets

> **CRITICAL**: This is an EVALUATION protocol, NOT an implementation guide. Your task is to ASSESS, MEASURE, and REPORT. NO ASSUMPTIONS. NO GUESSES. FACT-CHECK EVERYTHING.

---

## Mission

**Objective**: Provide objective, fact-checked evaluation of the Feature Inference Engine's quality across 4 core subsystems.

**Output**: Executive summary report for human decision-makers (product managers, technical leads).

**Method**: Database queries, code analysis, test execution, sample data processing.

**Standards**: No subjective opinions. Every claim backed by verifiable evidence.

---

## Evaluation Structure

```
Part 1: Extraction Quality (Evidence Extraction from Documents)
Part 2: Graph Quality (Feature-Evidence Relationships)
Part 3: Inference Quality (Feature Discovery & Clustering)
Part 4: Ticket Quality (Jira Epic/Story Generation)
Part 5: End-to-End Quality (Full Pipeline Performance)
Part 6: Executive Summary (Human-Readable Report)
```

**Estimated time**: 2-3 hours
**Output file**: `improvements/EVALUATION_REPORT_{timestamp}.md`

---

## PART 1: Extraction Quality Evaluation

### 1.1 Evidence Extraction Accuracy

**MANDATORY TESTS:**

#### Test 1.1.A: PDF Extraction Completeness
```bash
# Get a sample PDF that was processed
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT d.filename, d.file_type, COUNT(e.id) as evidence_count
FROM documents d
LEFT JOIN evidence e ON d.id = e.document_id
WHERE d.file_type = 'application/pdf'
AND d.status = 'completed'
ORDER BY d.uploaded_at DESC
LIMIT 5;
"
```

**Analysis required:**
1. ✅ Manually review 1 PDF file (read actual content)
2. ✅ Count extractable items (endpoints, requirements, constraints)
3. ✅ Compare to evidence_count from database
4. ✅ Calculate: `extraction_rate = evidence_count / extractable_items`

**Grading:**
- 90-100% extracted: A (Excellent)
- 70-89% extracted: B (Good)
- 50-69% extracted: C (Acceptable)
- <50% extracted: F (Poor)

**NO GUESSING:** You MUST read the actual PDF and count items manually.

#### Test 1.1.B: Screenshot Extraction Accuracy
```bash
# Get screenshots with evidence
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT d.filename, COUNT(e.id) as ui_elements_extracted
FROM documents d
LEFT JOIN evidence e ON d.id = e.document_id
WHERE d.file_type LIKE 'image/%'
AND e.type = 'ui_element'
GROUP BY d.id, d.filename
ORDER BY d.uploaded_at DESC
LIMIT 5;
"
```

**Analysis required:**
1. ✅ View 1 screenshot file (actual PNG/JPG)
2. ✅ Count visible UI elements (buttons, inputs, icons, text)
3. ✅ Compare to ui_elements_extracted
4. ✅ Check for false positives (extracted items that don't exist)
5. ✅ Check for false negatives (missed items)

**Metrics:**
- Precision: `true_positives / (true_positives + false_positives)`
- Recall: `true_positives / (true_positives + false_negatives)`
- F1 Score: `2 * (precision * recall) / (precision + recall)`

**Grading:**
- F1 ≥ 0.90: A
- F1 ≥ 0.75: B
- F1 ≥ 0.60: C
- F1 < 0.60: F

#### Test 1.1.C: API Spec Extraction
```bash
# Get JSON/YAML files
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT d.filename,
       COUNT(e.id) FILTER (WHERE e.type = 'endpoint') as endpoints,
       COUNT(e.id) FILTER (WHERE e.type = 'payload') as payloads
FROM documents d
LEFT JOIN evidence e ON d.id = e.document_id
WHERE d.file_type IN ('application/json', 'text/yaml', 'application/x-yaml')
GROUP BY d.id, d.filename;
"
```

**Analysis required:**
1. ✅ Open 1 JSON API spec file
2. ✅ Count actual endpoints in file
3. ✅ Count actual schemas/payloads in file
4. ✅ Compare to database counts
5. ✅ Verify endpoint format correctness

**Grading:**
- 95-100% accuracy: A
- 85-94% accuracy: B
- 70-84% accuracy: C
- <70% accuracy: F

---

### 1.2 Evidence Quality Assessment

#### Test 1.2.A: Atomicity Check
```bash
# Sample 20 random evidence items
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT id, type, content
FROM evidence
ORDER BY RANDOM()
LIMIT 20;
"
```

**Manual review required:**
1. ✅ Read each evidence item
2. ✅ Check if understandable in isolation (atomic)
3. ✅ Check if it's a summary (WRONG) or atomic fact (CORRECT)
4. ✅ Count violations

**Grading:**
- 0-1 violations (95%+): A
- 2-3 violations (85-90%): B
- 4-5 violations (75-80%): C
- 6+ violations (<70%): F

**Example violations:**
- ❌ "User authentication system with login and logout" (summary)
- ✅ "POST /api/auth/login endpoint" (atomic)

#### Test 1.2.B: Type Accuracy
```bash
# Check evidence type distribution
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT type, COUNT(*) as count, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as percentage
FROM evidence
GROUP BY type
ORDER BY count DESC;
"
```

**Analysis:**
1. ✅ Sample 5 items per type
2. ✅ Verify type assignment is correct
3. ✅ Check for misclassifications

**Example checks:**
- endpoint type: Should have HTTP method + path
- ui_element type: Should describe visible UI component
- requirement type: Should be functional requirement, not technical

**Grading:**
- 0-2 misclassifications in 30 samples (93%+): A
- 3-5 misclassifications (83-90%): B
- 6-9 misclassifications (70-80%): C
- 10+ misclassifications (<67%): F

---

### 1.3 Extraction Performance Metrics

```bash
# Processing time per document
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  d.filename,
  d.file_type,
  pj.status,
  pj.retry_count,
  EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at)) as processing_seconds,
  COUNT(e.id) as evidence_extracted
FROM documents d
JOIN processing_jobs pj ON d.id = pj.document_id
LEFT JOIN evidence e ON d.id = e.document_id
WHERE pj.status = 'completed'
GROUP BY d.id, d.filename, d.file_type, pj.status, pj.retry_count, pj.started_at, pj.completed_at
ORDER BY processing_seconds DESC
LIMIT 10;
"
```

**Metrics to calculate:**
1. Average processing time per document type
2. Retry rate: `retries / total_jobs`
3. Evidence per second: `total_evidence / total_seconds`
4. Timeout rate: `timeouts / total_jobs`

**Grading:**
- Average < 60s per doc: A
- Average 60-120s: B
- Average 120-180s: C
- Average > 180s: F

**Grading - Retry rate:**
- <10% retry rate: A
- 10-25% retry rate: B
- 25-50% retry rate: C
- >50% retry rate: F

---

## PART 2: Graph Quality Evaluation

### 2.1 Feature-Evidence Relationship Integrity

#### Test 2.1.A: Relationship Coverage
```bash
# Check if all evidence is linked to features
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  COUNT(*) FILTER (WHERE fe.feature_id IS NULL) as orphaned_evidence,
  COUNT(*) FILTER (WHERE fe.feature_id IS NOT NULL) as linked_evidence,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fe.feature_id IS NOT NULL) / COUNT(*), 1) as coverage_percentage
FROM evidence e
LEFT JOIN feature_evidence fe ON e.id = fe.evidence_id;
"
```

**Grading:**
- 90-100% coverage: A
- 75-89% coverage: B
- 60-74% coverage: C
- <60% coverage: F

#### Test 2.1.B: Relationship Type Distribution
```bash
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  relationship_type,
  COUNT(*) as count,
  AVG(CAST(strength AS FLOAT)) as avg_strength,
  MIN(CAST(strength AS FLOAT)) as min_strength,
  MAX(CAST(strength AS FLOAT)) as max_strength
FROM feature_evidence
GROUP BY relationship_type
ORDER BY count DESC;
"
```

**Manual validation:**
1. ✅ Sample 5 relationships per type
2. ✅ Read feature name + evidence content
3. ✅ Verify relationship_type is semantically correct
4. ✅ Verify strength score makes sense (0-1)

**Example validation:**
```
Feature: "User Authentication"
Evidence: "POST /api/auth/login endpoint"
Relationship: "implements"
Strength: 0.85

Question: Does this endpoint IMPLEMENT authentication? YES ✅
Is strength appropriate? YES (high certainty) ✅
```

**Grading:**
- 0-1 misclassified (95%+): A
- 2-3 misclassified (85-90%): B
- 4-6 misclassified (70-80%): C
- 7+ misclassified (<65%): F

---

### 2.2 Graph Structure Quality

#### Test 2.2.A: Evidence-per-Feature Distribution
```bash
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  f.name,
  COUNT(fe.evidence_id) as evidence_count,
  COUNT(DISTINCT e.document_id) as source_documents,
  ARRAY_AGG(DISTINCT e.type) as evidence_types
FROM features f
LEFT JOIN feature_evidence fe ON f.id = fe.feature_id
LEFT JOIN evidence e ON fe.evidence_id = e.id
GROUP BY f.id, f.name
ORDER BY evidence_count DESC;
"
```

**Analysis:**
- Features with 0 evidence: CRITICAL ISSUE
- Features with 1-2 evidence: WEAK (low confidence expected)
- Features with 3-5 evidence: NORMAL
- Features with 6-10 evidence: STRONG
- Features with 10+ evidence: VERY STRONG or potential merge candidate

**Grading:**
- 0 features with 0 evidence: A
- 1-2 features with 0 evidence: B
- 3-5 features with 0 evidence: C
- 6+ features with 0 evidence: F

#### Test 2.2.B: Cross-Document Evidence (Diversity)
```bash
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  f.name,
  f.confidence_score,
  COUNT(DISTINCT e.document_id) as source_count,
  COUNT(fe.evidence_id) as total_evidence
FROM features f
JOIN feature_evidence fe ON f.id = fe.feature_id
JOIN evidence e ON fe.evidence_id = e.id
GROUP BY f.id, f.name, f.confidence_score
HAVING COUNT(DISTINCT e.document_id) > 1
ORDER BY source_count DESC;
"
```

**Quality metric:**
- Features from 3+ sources: HIGHEST QUALITY (cross-validated)
- Features from 2 sources: GOOD QUALITY
- Features from 1 source: ACCEPTABLE (but less reliable)

**Expected:** High-confidence features should have evidence from multiple sources.

**Grading:**
- 80%+ high-confidence features multi-source: A
- 60-79% multi-source: B
- 40-59% multi-source: C
- <40% multi-source: F

---

### 2.3 Duplicate Evidence Detection

```bash
# Check for potential duplicate evidence
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  e1.content,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(DISTINCT e1.id) as evidence_ids,
  ARRAY_AGG(DISTINCT d.filename) as from_files
FROM evidence e1
JOIN evidence e2 ON e1.content = e2.content AND e1.id < e2.id
JOIN documents d ON e1.document_id = d.id
GROUP BY e1.content
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
"
```

**Analysis:**
- Identical content from same document: EXPECTED (extraction artifact)
- Identical content from different documents: VALIDATION (good!)
- Near-identical with minor variations: POTENTIAL DEDUPLICATION NEEDED

**Grading:**
- <5% exact duplicates: A
- 5-10% duplicates: B
- 10-20% duplicates: C
- >20% duplicates: F

---

## PART 3: Inference Quality Evaluation

### 3.1 Clustering Performance

#### Test 3.1.A: Cluster Quality Metrics
```bash
# Run clustering and analyze results
# This requires running inference with instrumentation
```

**Code instrumentation needed:**

Add to `lib/services/ClusteringService.ts` (temporary logging):
```typescript
async clusterEvidence(): Promise<EvidenceCluster[]> {
  // ... existing code

  // ADD THIS BEFORE RETURNING:
  const stats = {
    totalEvidence: itemsWithEmbeddings.length,
    clustersFormed: clusters.length,
    avgClusterSize: clusters.reduce((sum, c) => sum + c.size, 0) / clusters.length,
    minClusterSize: Math.min(...clusters.map(c => c.size)),
    maxClusterSize: Math.max(...clusters.map(c => c.size)),
    singletonClusters: clusters.filter(c => c.size === 1).length,
    noisePoints: itemsWithEmbeddings.length - clusters.reduce((sum, c) => sum + c.size, 0),
  };

  console.log('CLUSTERING_STATS:', JSON.stringify(stats));

  return clusters;
}
```

**Then run inference and extract stats from logs:**
```bash
# Run inference
curl -X POST http://localhost:3000/api/inference/run

# Extract clustering stats from server logs
tail -1000 /path/to/server/logs | grep "CLUSTERING_STATS"
```

**Metrics to calculate:**
1. **Silhouette score** (clustering quality, -1 to 1)
   - Would require additional computation with embeddings
   - Higher is better (well-separated clusters)
2. **Noise ratio**: `noise_points / total_evidence`
   - Lower is better (less orphaned evidence)
3. **Cluster size variance**: Standard deviation of cluster sizes
   - Lower is better (balanced clusters)

**Grading - Noise ratio:**
- <10% noise: A
- 10-20% noise: B
- 20-30% noise: C
- >30% noise: F

**Grading - Cluster balance:**
- Variance < 5: A (balanced)
- Variance 5-10: B
- Variance 10-20: C
- Variance > 20: F (imbalanced - some huge, some tiny)

---

### 3.2 Feature Inference Accuracy

#### Test 3.2.A: Feature Naming Quality
```bash
# Get all inferred features
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT name, confidence_score, status
FROM features
ORDER BY confidence_score DESC;
"
```

**Manual review (NO ASSUMPTIONS):**
1. ✅ Read each feature name
2. ✅ Rate clarity (1-5): Is it clear what this feature does?
3. ✅ Rate accuracy (1-5): Does name match evidence content?
4. ✅ Check for duplicates (exact or semantic)
5. ✅ Check for overly generic names ("Feature", "Component")
6. ✅ Check for overly specific names (should be story/task)

**Grading - Average clarity score:**
- 4.5-5.0: A (Excellent naming)
- 4.0-4.4: B (Good naming)
- 3.5-3.9: C (Acceptable naming)
- <3.5: F (Poor naming)

#### Test 3.2.B: Duplicate Feature Detection
```bash
# Find features with identical names
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT name, COUNT(*) as duplicate_count, ARRAY_AGG(id) as feature_ids
FROM features
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
"
```

**Analysis:**
- Count duplicate pairs
- For each pair, verify if they SHOULD have been merged
- Read evidence for each to determine if truly duplicate

**Grading:**
- 0 duplicates: A
- 1-2 duplicate pairs: B
- 3-5 duplicate pairs: C
- 6+ duplicate pairs: F

**Current system (fact-checked):** 6 duplicate pairs = C grade

#### Test 3.2.C: Confidence Score Calibration
```bash
# Compare confidence scores to evidence strength
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  f.name,
  CAST(f.confidence_score AS FLOAT) as confidence,
  COUNT(fe.evidence_id) as evidence_count,
  COUNT(DISTINCT e.document_id) as source_count,
  ARRAY_AGG(DISTINCT e.type) as evidence_types
FROM features f
LEFT JOIN feature_evidence fe ON f.id = fe.feature_id
LEFT JOIN evidence e ON fe.evidence_id = e.id
GROUP BY f.id, f.name, f.confidence_score
ORDER BY f.confidence_score DESC;
"
```

**Manual validation:**
For each feature, check if confidence matches evidence strength:
- High confidence (>0.85) should have: 6+ evidence, 2+ sources, multiple types
- Medium confidence (0.65-0.85): 3-6 evidence, 1-2 sources
- Low confidence (<0.65): 1-3 evidence, 1 source

**Misalignment examples:**
- ❌ High confidence (0.95) but only 2 evidence items from 1 source
- ❌ Low confidence (0.55) but 8 evidence items from 3 sources

**Grading:**
- 0-1 misalignments: A
- 2-3 misalignments: B
- 4-6 misalignments: C
- 7+ misalignments: F

---

### 3.3 Merge Effectiveness

```bash
# Check if obvious duplicates were merged
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  f1.name as feature1,
  f2.name as feature2,
  f1.confidence_score as conf1,
  f2.confidence_score as conf2
FROM features f1, features f2
WHERE f1.id < f2.id
AND (
  f1.name = f2.name  -- Exact duplicates
  OR f1.name ILIKE f2.name  -- Case-insensitive
  OR (
    -- Semantic duplicates (manual list)
    (f1.name ILIKE '%login%' AND f2.name ILIKE '%sign in%')
    OR (f1.name ILIKE '%logout%' AND f2.name ILIKE '%sign out%')
  )
);
"
```

**For each pair:**
1. ✅ Verify they are true duplicates (read evidence)
2. ✅ Check if merge was attempted (look in metadata)
3. ✅ If not merged, determine why (score < 0.75? LLM said not duplicate?)

**Grading:**
- All obvious duplicates merged: A
- 1-2 missed merges: B
- 3-4 missed merges: C
- 5+ missed merges: F

---

## PART 4: Ticket Generation Quality

### 4.1 Epic Structure Quality

#### Test 4.1.A: Epic-Story Appropriateness
```bash
# Export 3 sample epics and analyze
```

**Manual process:**
1. ✅ Identify 3 features to export
2. ✅ Call export API: `GET /api/features/{id}/export?format=json&platform=ios`
3. ✅ Review generated epic structure

**For each epic, validate:**

**Epic Title:**
- [ ] Is this truly an "epic" (broad domain)? Or should it be a story?
- [ ] Is name clear and user-friendly?
- [ ] Does it represent a logical grouping?

**Stories:**
- [ ] Are stories specific enough (not too broad)?
- [ ] Are stories too specific (should be subtasks)?
- [ ] Do stories belong to this epic (semantic coherence)?
- [ ] Is there overlap between stories (DRY violation)?

**Subtasks:**
- [ ] Are subtasks implementation-level (technical)?
- [ ] Are they platform-specific (iOS, Android, Web)?
- [ ] Do they have reasonable time estimates?
- [ ] Are they actionable (clear what to implement)?

**Grading per epic:**
- 0-1 issues: A
- 2-3 issues: B
- 4-5 issues: C
- 6+ issues: F

**Average across 3 epics for final grade.**

---

### 4.2 Evidence-to-Ticket Mapping

#### Test 4.2.A: Evidence Coverage in Tickets
```bash
# For a specific feature, check if all evidence appears in export
```

**Process:**
1. ✅ Get evidence for feature:
```sql
SELECT e.type, e.content
FROM evidence e
JOIN feature_evidence fe ON e.id = fe.evidence_id
WHERE fe.feature_id = 'sample_feature_id';
```

2. ✅ Export feature as epic
3. ✅ Read epic JSON/markdown
4. ✅ Check if each evidence item appears in epic/stories/subtasks
5. ✅ Calculate coverage: `mentioned_evidence / total_evidence`

**Grading:**
- 90-100% coverage: A (All evidence represented)
- 75-89% coverage: B (Most evidence present)
- 60-74% coverage: C (Significant gaps)
- <60% coverage: F (Major data loss)

---

### 4.3 Platform Targeting Accuracy

#### Test 4.3.A: Platform-Specific Content
```bash
# Export same feature for iOS and Web, compare
```

**Process:**
1. ✅ Export feature with `platform=ios`
2. ✅ Export same feature with `platform=web`
3. ✅ Compare subtasks

**Validation:**
- iOS export should mention: Swift, UIKit, SwiftUI, StoreKit, AVFoundation
- Web export should mention: React, Next.js, HTML5, CSS, JavaScript
- Should NOT mention other platforms' tech

**Example check:**
```
iOS Export:
✅ "Implement UIKit view controller" (correct)
❌ "Create React component" (WRONG - web technology)

Web Export:
✅ "Implement React component" (correct)
❌ "Use AVPlayer for video" (WRONG - iOS technology)
```

**Grading:**
- 0 cross-platform leaks: A
- 1-2 leaks in 20 subtasks: B
- 3-5 leaks: C
- 6+ leaks: F

---

## PART 5: End-to-End Quality

### 5.1 Full Pipeline Test

**Process:**
1. Upload new test document (e.g., API spec with 10 endpoints)
2. Wait for extraction
3. Run inference
4. Export generated feature as epic

**Measure:**
1. Time from upload to export-ready
2. Evidence extraction rate (10 endpoints → X evidence)
3. Feature inference (how many features from 10 endpoints?)
4. Export quality (manual review)

**Expected:**
- 10 endpoints → 10-15 evidence items (includes payloads)
- 10-15 evidence → 1-2 features (if related) or 3-5 features (if diverse)
- Export contains all endpoints in epic/stories

**Grading:**
- All steps successful, output correct: A
- 1 step has minor issues: B
- 2 steps have issues: C
- 3+ steps have issues: F

---

### 5.2 Accuracy Validation (Ground Truth)

**GOLD STANDARD TEST:**

**Setup:**
1. ✅ Create synthetic test document with KNOWN content
2. ✅ Example: PDF with exactly 5 endpoints, 3 UI descriptions, 2 requirements
3. ✅ Upload and process

**Validation:**
```sql
SELECT type, COUNT(*) as extracted
FROM evidence
WHERE document_id = 'test_doc_id'
GROUP BY type;
```

**Expected:**
```
endpoint: 5
ui_element: 3
requirement: 2
Total: 10
```

**Compare to actual:**
- Precision: No extra items extracted (false positives)
- Recall: All items extracted (no false negatives)

**Grading:**
- 100% precision + 100% recall: A
- 90-99% precision + recall: B
- 80-89% precision + recall: C
- <80%: F

---

## PART 6: System Health Metrics

### 6.1 Database Health

```bash
# Database statistics
docker-compose exec -T postgres psql -U engine -d feature_engine -c "
SELECT
  'Documents' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  pg_size_pretty(pg_total_relation_size('documents')) as size
FROM documents

UNION ALL

SELECT
  'Evidence' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
  COUNT(*) FILTER (WHERE obsolete = true) as obsolete,
  pg_size_pretty(pg_total_relation_size('evidence')) as size
FROM evidence

UNION ALL

SELECT
  'Features' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
  COUNT(*) FILTER (WHERE status = 'candidate') as candidate,
  pg_size_pretty(pg_total_relation_size('features')) as size
FROM features

UNION ALL

SELECT
  'Relationships' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT feature_id) as unique_features,
  COUNT(DISTINCT evidence_id) as unique_evidence,
  pg_size_pretty(pg_total_relation_size('feature_evidence')) as size
FROM feature_evidence;
"
```

**Health checks:**
- [ ] No tables excessively large (>100MB for current scale)
- [ ] Completion rate for documents >80%
- [ ] Embedding coverage >90%
- [ ] Feature-evidence ratio reasonable (2-10 evidence per feature)

---

### 6.2 Performance Benchmarks

**Execute and measure:**

```bash
# Benchmark 1: Inference pipeline end-to-end
time curl -X POST http://localhost:3000/api/inference/run

# Benchmark 2: Epic generation
time curl "http://localhost:3000/api/features/{id}/export?format=json&platform=ios"

# Benchmark 3: Feature listing
time curl "http://localhost:3000/api/features"

# Benchmark 4: Evidence query
time curl "http://localhost:3000/api/evidence"
```

**Grading - Inference pipeline:**
- <2 minutes: A
- 2-5 minutes: B
- 5-10 minutes: C
- >10 minutes: F

**Grading - API response times:**
- <500ms: A
- 500ms-2s: B
- 2s-5s: C
- >5s: F

---

## PART 7: Code Quality Assessment

### 7.1 Architecture Compliance

**Files to review:**
- `lib/services/ExtractionService.ts`
- `lib/services/FeatureInferenceService.ts`
- `lib/services/TicketService.ts`
- `lib/services/ClusteringService.ts`

**Verify SOLID principles:**

#### Single Responsibility (SRP)
For each service:
1. ✅ Read the service file
2. ✅ List all responsibilities
3. ✅ Check if more than 1 reason to change

**Grading:**
- All services follow SRP: A
- 1 service violates: B
- 2 services violate: C
- 3+ services violate: F

#### Dependency Inversion (DIP)
```bash
# Check dependencies
grep "import.*from 'openai'" lib/services/*.ts
```

**Should be:** Services depend on `LLMClient` interface
**Should NOT be:** Direct `import OpenAI from 'openai'`

**Grading:**
- All services use abstractions: A
- 1-2 direct dependencies: B
- 3-4 direct dependencies: C
- 5+ direct dependencies: F

---

### 7.2 Test Coverage Analysis

```bash
# Run tests with coverage
pnpm test -- --coverage

# Check coverage report
cat coverage/coverage-summary.json
```

**Minimum thresholds:**
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

**Grading:**
- All above 80%: A
- All above 70%: B
- All above 60%: C
- Any below 60%: F

---

## PART 8: Scalability Projections

### 8.1 Algorithmic Complexity Analysis

**Current system (fact-checked from code):**

**Extraction:** O(n * m) where n=documents, m=chunks per document
- Measured: 15 chunks per PDF, 2-66s per chunk
- Projected for 100 PDFs: 1500 chunks × 10s avg = 4 hours

**Clustering:** O(n²) where n=evidence items
- Current: 200 evidence items = 40,000 distance calculations (~1 second)
- Projected for 10,000 evidence: 100M calculations = ~17 minutes

**Duplicate merge:** O(f²) where f=features
- Current: 17 features = 136 comparisons (with optimization: ~40)
- Projected for 100 features: 10,000 comparisons (with optimization: ~3,000) = ~50 minutes

**Relationship building:** O(f × e) where f=features, e=avg evidence per feature
- Current: 17 features × 3 evidence = 51 LLM calls (~1 minute)
- Projected for 100 features × 5 evidence: 500 calls = ~8 minutes

**Total pipeline:**
- Current (17 features, 200 evidence): ~3 minutes
- Projected (100 features, 1000 evidence): ~20-25 minutes

**Grading:**
- <5 minutes at current scale: A
- 5-10 minutes: B
- 10-20 minutes: C
- >20 minutes: F

---

## EVALUATION REPORT TEMPLATE

**File**: `improvements/EVALUATION_REPORT_{timestamp}.md`

```markdown
# Feature Inference Engine - Quality Evaluation Report
**Date**: {current_date}
**Evaluator**: Claude Code Session
**Data Scale**: {N} documents, {M} evidence items, {F} features

---

## Executive Summary

**Overall Grade**: A/B/C/F

**Critical Issues Found**: {count}
**Major Issues Found**: {count}
**Minor Issues Found**: {count}

**Recommendation**: PRODUCTION READY / NEEDS IMPROVEMENT / NOT READY

---

## 1. Extraction Quality: {Grade}

**PDF Extraction**: {X}% accuracy - {Grade}
- Evidence extracted: {count}
- Evidence expected: {count}
- Missing: {list}

**Screenshot Extraction**: F1 = {score} - {Grade}
- Precision: {X}%
- Recall: {Y}%
- False positives: {count}

**API Spec Extraction**: {X}% accuracy - {Grade}

**Issues:**
1. {Issue description with evidence}
2. {Issue description with evidence}

**Recommendations:**
1. {Specific fix}
2. {Specific fix}

---

## 2. Graph Quality: {Grade}

**Relationship Coverage**: {X}% - {Grade}
- Linked evidence: {count}
- Orphaned evidence: {count}

**Relationship Accuracy**: {X}% correct - {Grade}
- Validated: {count} relationships
- Misclassified: {count} relationships
- Examples: {list}

**Cross-Document Evidence**: {X}% multi-source - {Grade}
- High-confidence features from multiple docs: {X}%

**Issues:**
{list}

**Recommendations:**
{list}

---

## 3. Inference Quality: {Grade}

**Clustering**: Noise ratio {X}% - {Grade}
**Feature Naming**: Avg clarity {X}/5 - {Grade}
**Duplicate Detection**: {X} duplicates found - {Grade}
**Confidence Calibration**: {X} misalignments - {Grade}

**Issues:**
{list}

**Recommendations:**
{list}

---

## 4. Ticket Quality: {Grade}

**Epic Appropriateness**: {X}/3 epics well-structured - {Grade}
**Evidence Coverage**: {X}% in tickets - {Grade}
**Platform Targeting**: {X} cross-platform leaks - {Grade}

**Sample Export Analysis:**

Epic: "{name}"
├─ Title appropriateness: {Good/Poor}
├─ Story count: {count}
├─ Story appropriateness: {X}/Y good
├─ Subtask quality: {Good/Poor}
└─ Platform specificity: {Correct/Mixed}

**Issues:**
{list}

**Recommendations:**
{list}

---

## 5. Performance & Scalability: {Grade}

**Current Pipeline**: {X} minutes for {N} features - {Grade}
**Projected at 100 features**: {X} minutes - {Grade}
**API Response Times**: {X}ms average - {Grade}

**Bottlenecks:**
1. {Component}: O({complexity})
2. {Component}: {X} seconds

**Recommendations:**
{list}

---

## 6. Code Quality: {Grade}

**SOLID Compliance**: {X}/5 principles - {Grade}
**Test Coverage**: {X}% - {Grade}
**Type Safety**: {X} type errors - {Grade}

**Issues:**
{list}

---

## Overall Assessment

### Strengths
1. {Fact-checked strength with evidence}
2. {Fact-checked strength with evidence}
3. {Fact-checked strength with evidence}

### Weaknesses
1. {Fact-checked weakness with evidence}
2. {Fact-checked weakness with evidence}
3. {Fact-checked weakness with evidence}

### Critical Issues Requiring Immediate Action
1. {Issue with severity and impact}
2. {Issue with severity and impact}

### Recommended Improvements (Priority Order)
1. [HIGH] {Improvement with expected impact}
2. [MEDIUM] {Improvement with expected impact}
3. [LOW] {Improvement with expected impact}

---

## Production Readiness

**Criteria:**
- [ ] All critical issues resolved
- [ ] Overall grade B or higher
- [ ] Extraction accuracy >70%
- [ ] Inference accuracy >75%
- [ ] No data corruption risks
- [ ] Performance acceptable (<5 min)

**Decision**: READY / NOT READY / READY WITH CONDITIONS

**Conditions** (if applicable):
1. {Condition}
2. {Condition}

---

## Appendix: Raw Data

### A. Evidence Samples (20 random items)
{paste evidence items}

### B. Feature List (all features)
{paste feature names + confidence}

### C. Export Samples (3 epics)
{paste JSON exports}

### D. Database Query Results
{paste all query results}

---

**Report completed**: {timestamp}
**Evaluation duration**: {X} hours
**Methods used**: Database queries ({N}), manual reviews ({N}), code analysis ({N})
**Confidence in findings**: HIGH (all fact-checked)
```

---

## MANDATORY EVALUATION CHECKLIST

**Before starting:**
- [ ] Read this entire file
- [ ] Understand you are EVALUATING, not implementing
- [ ] Prepare to execute database queries
- [ ] Prepare to read actual files (PDFs, screenshots)
- [ ] Allocate 2-3 hours for thorough evaluation

**Part 1: Extraction (30 min)**
- [ ] Execute all extraction queries
- [ ] Manually review 1 PDF (read actual content)
- [ ] Manually review 1 screenshot (view actual image)
- [ ] Calculate accuracy metrics
- [ ] Grade each component

**Part 2: Graph (30 min)**
- [ ] Execute all graph queries
- [ ] Sample 10 relationships manually
- [ ] Validate relationship correctness
- [ ] Check for orphaned evidence
- [ ] Grade graph quality

**Part 3: Inference (40 min)**
- [ ] Run clustering analysis (instrument code)
- [ ] Review all feature names manually
- [ ] Check for duplicates
- [ ] Validate confidence calibration
- [ ] Grade inference quality

**Part 4: Tickets (30 min)**
- [ ] Export 3 sample features
- [ ] Review epic structure manually
- [ ] Check evidence coverage
- [ ] Test platform targeting
- [ ] Grade ticket quality

**Part 5: End-to-End (20 min)**
- [ ] Upload test document
- [ ] Measure full pipeline
- [ ] Validate output
- [ ] Grade overall quality

**Part 6: Reporting (30 min)**
- [ ] Compile all grades
- [ ] Write executive summary
- [ ] List critical issues
- [ ] Provide recommendations
- [ ] Save report

**Total: 3 hours**

**If you skip ANY part, your evaluation is INCOMPLETE and INVALID.**

---

## Objectivity Requirements

**FORBIDDEN:**
- ❌ "The system seems to work well" (subjective)
- ❌ "Probably extracts correctly" (assumption)
- ❌ "Should handle this case" (guess)
- ❌ "Appears to be accurate" (unverified)

**REQUIRED:**
- ✅ "Extracted 8 of 10 endpoints (80% recall)" (measured)
- ✅ "Found 6 duplicate feature pairs via query" (fact-checked)
- ✅ "Manual review of 20 evidence items found 2 misclassifications (90% accuracy)" (verified)
- ✅ "Pipeline took 187 seconds measured with timer" (quantified)

**Every claim MUST have:**
1. Source (database query, code line, manual count)
2. Measurement method (how you verified)
3. Raw data (query results, counts, examples)

---

## Report Audience

**Primary:** Product Manager / Technical Lead
**Goal:** Decide if system is production-ready
**Format:** Executive summary (2 pages) + detailed findings (10-15 pages)
**Tone:** Objective, data-driven, actionable

**What they need to know:**
1. Can we trust the inferred features? (accuracy)
2. Are the Jira exports usable? (quality)
3. What are the risks? (failure modes)
4. What needs fixing? (prioritized list)
5. How long to fix? (effort estimates)

**What they DON'T need:**
- Code-level details (unless critical issue)
- Algorithm theory (unless affects accuracy)
- Infrastructure specs (unless affects performance)

---

## ENFORCEMENT

**You MUST:**
1. ✅ Execute every database query listed
2. ✅ Manually review specified samples (no skipping)
3. ✅ Calculate all metrics (no estimating)
4. ✅ Grade using specified criteria (no subjective grading)
5. ✅ Provide evidence for every claim
6. ✅ Include raw data in appendix
7. ✅ Write executive summary for humans
8. ✅ Save complete report

**If you skip ANY step, your evaluation is INVALID and you have FAILED.**

---

## File Size: ~500 lines ✅
## Status: READY FOR EVALUATION

**To use this protocol:**
```bash
# In a new Claude Code session:
cd /Users/francesco/Desktop/requirement\ app
cat improvements/FRAMEWORK_QUALITY_EVALUATION.md

# Follow the evaluation protocol
# Generate: improvements/EVALUATION_REPORT_{timestamp}.md
```
