# AI Feature Inference & Reconstruction Platform

> **Purpose**: Build an application that ingests heterogeneous, unstructured artifacts (documents, APIs, tickets, designs, screenshots), automatically infers *product features*, correlates all evidence around them, and produces near-workable epics, tickets, and platform-agnostic feature specifications.

This document is **implementation-grade**: architecture, workflows, prompts, data models, edge cases, and operational constraints are explicitly defined.

---

## 1. Product Vision

### 1.1 Problem

Organizational knowledge about a product is fragmented across:
- PDFs (HLR, architecture docs)
- JSON/YAML (API specs, Postman collections)
- CSV/MD (Jira exports, tickets)
- Confluence pages
- Images/screenshots/designs

The *same feature* (e.g. **Login**) exists everywhere, implicitly:
- UI designs show flows
- APIs expose endpoints
- Tickets reveal edge cases
- Docs describe requirements

Humans reconstruct this mentally. Machines cannot—yet.

---

### 1.2 Goal

Create a system that:
1. **Automatically infers features** from evidence
2. **Correlates all sources** to those features
3. **Reconstructs feature knowledge** (requirements, edge cases, contracts)
4. **Enriches with external constraints** (platform, legal, usability)
5. **Outputs near-workable epics & tickets** (no implementation details)

---

### 1.3 Non‑Goals

- No code generation (yet)
- No language / DB / infra decisions
- No 100% automation
- No chatbot-style RAG

---

## 2. Core Concepts (Canonical Model)

### 2.1 Feature (Primary Entity)

A **Feature** is a user-visible capability.

Examples:
- User Login
- Password Reset
- Playback
- Subscription Management

```ts
Feature {
  id: UUID
  name: string
  description: string
  confidence_score: number // 0..1
  status: 'candidate' | 'confirmed'
}
```

---

### 2.2 Evidence

Small, atomic, semantic facts extracted from sources.

```ts
Evidence {
  id: UUID
  document_id: UUID
  type:
    | 'ui_element'
    | 'flow'
    | 'endpoint'
    | 'payload'
    | 'requirement'
    | 'edge_case'
    | 'acceptance_criteria'
    | 'bug'
  content: string
}
```

> **Rule**: Evidence must be understandable in isolation.

---

### 2.3 Feature–Evidence Relationship

```ts
FeatureEvidence {
  feature_id: UUID
  evidence_id: UUID
  relationship:
    | 'implements'
    | 'supports'
    | 'constrains'
    | 'extends'
  strength: number // 0..1
}
```

---

## 3. High-Level Architecture

```
┌──────────────────────────────────┐
│           Next.js App            │
│  UI + API Routes + Orchestrator  │
└───────────────┬──────────────────┘
                │
┌───────────────▼──────────────────┐
│          Feature Engine          │
│  - Extraction                    │
│  - Feature inference             │
│  - Correlation                   │
│  - Assembly                      │
└───────┬───────────────┬──────────┘
        │               │
┌───────▼──────┐ ┌──────▼─────────┐
│ PostgreSQL   │ │ pgvector /      │
│ (graph +    │ │ Chroma (local)  │
│ state)      │ │ embeddings      │
└─────────────┘ └─────────────────┘
        │
┌───────▼────────────────┐
│ Local File Storage      │
│ (PDF, images, exports) │
└────────────────────────┘
```

**All components run locally** (Docker or bare-metal).

---

## 4. End-to-End Workflow

### Step 1 — File Ingestion

- Upload PDFs, images, CSV, JSON, YAML, MD
- Store locally
- Create `Document` records

Edge cases:
- Duplicate files → hash detection
- Large files → chunking
- Corrupt files → reject + log

---

### Step 2 — Semantic Extraction (per format)

| Format | Method | Output Evidence |
|------|-------|----------------|
| PDF / MD | Text + LLM | requirements, constraints |
| JSON / YAML | Structural parse | endpoints, payloads |
| CSV | Row parsing | bugs, acceptance criteria |
| Images | Vision (OpenAI) | UI elements, flows |

**Prompt pattern**:
```
Extract atomic evidence. No summaries.
Return a list of evidence objects.
```

---

### Step 3 — Feature Hypothesis Inference

**Goal**: Infer *what features exist*.

#### Input
- 20–50 Evidence items (batched)

#### Prompt (core)
```
You are inferring product features.

Given the following evidence:
- Identify candidate features
- Assign evidence to features
- Provide confidence (0–1)

Return JSON only.
```

#### Output
```json
{
  "feature": "User Login",
  "confidence": 0.91,
  "evidence_ids": [1, 4, 9]
}
```

---

### Step 4 — Feature Confidence Scoring

Final confidence is **aggregated**, not single-shot.

```ts
confidence = 1 - Π(1 - signal_weight)
```

**Signals**:
- API endpoint mentioning feature (+0.4)
- UI screenshot (+0.3)
- Jira history (+0.2)
- Explicit requirement (+0.4)

Thresholds:
- `<0.5` → discard
- `0.5–0.75` → candidate
- `>0.75` → auto-confirm (still reviewable)

---

### Step 5 — Human Consolidation UI

User can:
- Merge duplicate features
- Rename
- Delete false positives

This step takes **minutes**, increases reliability to ~90%.

---

### Step 6 — Feature Knowledge Assembly

For each confirmed feature, assemble:

- Functional requirements
- UI expectations
- API contracts (shape only)
- Edge cases
- Acceptance criteria

Output is **platform-agnostic**.

---

### Step 7 — External Enrichment

Scoped research per feature:

- iOS / Android / Web guidelines
- Accessibility
- Security best practices
- Legal constraints (by country)

Rules:
- Source-limited
- Citations required
- Advisory only

---

### Step 8 — Output Generation

Generate:
- Epic
- Stories
- Tasks
- Acceptance criteria
- Platform notes

LLM roles:
- **Claude Code** → planning, structure
- **OpenAI** → synthesis, summarization

---

## 5. Embeddings Strategy (Local)

### Purpose

- Cluster evidence
- Suggest feature candidates
- Detect missing links

### Rules

- Embed **Evidence**, not documents
- Use `text-embedding-3-large`
- Store locally (pgvector or Chroma)

Embeddings are **assistive**, never authoritative.

---

## 6. Frontend (Next.js)

### Pages

- Upload & ingestion
- Evidence review
- Feature candidates
- Feature detail view
- Ticket preview

### UX Principles

- Always show *why* a feature exists
- Show confidence
- Allow override

---

## 7. Backend (Node.js / Next.js API)

### Services

- ExtractionService
- FeatureInferenceService
- CorrelationService
- AssemblyService
- EnrichmentService

All stateless; DB is source of truth.

---

## 8. Error Handling & Edge Cases

### Data
- Empty documents → skip
- Partial extraction → flag
- Conflicting requirements → surface

### Scale
- Hundreds of tickets → batch jobs
- Large PDFs → page-level chunking
- Rate limits → queue + retry

### Safety
- Never auto-delete evidence
- Full audit trail

---

## 9. Reliability Expectations

| Stage | Accuracy |
|-----|---------|
| Evidence extraction | 85–90% |
| Feature inference | 65–80% |
| After review | 85–95% |
| Ticket usefulness | High |

---

## 10. Why This Is Not Utopia

- Features are inferred, not invented
- Humans validate at leverage points
- Confidence is explicit
- System improves with usage

---

## 11. Final Statement

This system is **buildable today**, using:
- Next.js
- Node.js
- OpenAI
- Claude Code
- PostgreSQL + local embeddings

It reconstructs *feature-level truth* from messy reality.

That is the real breakthrough.

