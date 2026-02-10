# Ticket Template Framework — Improvement Plan

**Date:** 2026-02-10
**Scope:** Primarily `lib/services/TicketService.ts`, with touches to schema, prompts, and utils

---

## Problem Statement

The template formatter produces the correct 17-section markdown structure, but the data populating those sections is unreliable. Key issues: duplicate ticket keys on every export, placeholder acceptance criteria, empty HLR/API/dependency sections despite data existing in the DB, and LLM calls with no retry or meaningful context. This plan fixes data quality from highest to lowest impact.

---

## Session Structure

This plan is designed for execution as **3 focused sessions** or **1 long session with 3 sequential batches**. Each batch is independent — completing batch 1 alone is a valid stopping point.

**Batch A** (items 1–3): Schema fix + two data-source rewires. No LLM calls. ~30 min context.
**Batch B** (items 4–6): LLM prompt improvements + retry/cache. ~40 min context.
**Batch C** (items 7–9): Lower-priority enrichment and dependency fixes. ~20 min context.

---

## Batch A — Data Correctness (No LLM Changes)

### 1. Persistent Ticket Key Counter

**Problem:** `KeyGenerator` starts from hardcoded 1/100 on every `generateEpicFull()` call. Regenerating tickets produces duplicate keys.

**Files to change:**
- `lib/db/schema.ts` — add `keyCounter` integer column to `ticketConfig` table
- `drizzle/migrations/` — new migration: `ALTER TABLE ticket_config ADD COLUMN key_counter integer NOT NULL DEFAULT 1;`
- `lib/types/ticketConfig.ts` — add `keyCounter: number` to `TicketConfig` interface and default
- `lib/services/TicketService.ts` — in `generateEpicFull()`, read counter from config, compute `totalKeysNeeded = 1 + stories.length`, atomically increment via `db.update(ticketConfig).set({ keyCounter: start + totalKeysNeeded })`, pass `start` to `new KeyGenerator(projectKey, start)`
- `lib/services/TicketService.ts` — in `getTicketConfig()`, include `keyCounter` in return
- `app/api/settings/ticket-config/route.ts` — expose `keyCounter` in GET, allow reset via PUT

**Verify:** Export same epic twice → keys don't overlap.

---

### 2. HLR References from Evidence Data

**Problem:** `extractHlrReferences()` regex-scans description text for `2.3.a.` patterns. Fails for most features because descriptions are system-generated, not Jira CSV pastes. Meanwhile, requirement-type evidence linked to the feature contains the actual HLR content in `evidence.content`.

**Files to change:**
- `lib/services/TicketService.ts` — change `extractHlrReferences` signature to `async extractHlrReferences(story: JiraStory, childFeatureId?: string): Promise<string[]>`
- Add DB query: select `evidence.content` where `featureEvidence.featureId = childFeatureId AND evidence.type = 'requirement'`
- Deduplicate against existing regex results
- Update call site in `generateEpicFull()` — need to pass `childFeatureId` (requires tracking which child feature produced which story; add a map of `story.title → childFeature.id` built during the stories loop)
- Import `and` from `drizzle-orm` (already imported as `eq`, just add `and`)

**Verify:** Export a feature that has requirement evidence → HLR section populated.

---

### 3. API Endpoints from ApiContract

**Problem:** `extractApiEndpoints()` regex-scans description for `GET /path`. The structured `ApiContract` with typed endpoints already exists in `feature_outputs` and is loaded in `getOutputs()`, but never passed to story-level endpoint extraction.

**Files to change:**
- `lib/services/TicketService.ts` — add method:
  ```
  extractApiEndpointsFromContract(apiContract?: ApiContract): Array<{endpoint, method, purpose}>
  ```
  Maps `apiContract.endpoints` to the table format.
- In `generateEpicFull()`, after `const outputs = await this.getOutputs(featureId)`, pass `outputs.apiContract` to each story's endpoint extraction. Use contract data as primary source, fall back to description regex.

**Verify:** Export a feature with api_contract output → API table populated with correct endpoints.

---

## Batch B — LLM Quality Improvements

### 4. Evidence Summary for User Story Prompt

**Problem:** Evidence summary passed to `buildUserStoryPrompt()` is literally `"Based on 7 evidence items"`. The LLM has no actual context to generate a meaningful user story.

**Files to change:**
- `lib/services/TicketService.ts` — add helper:
  ```
  getEvidenceByIds(ids: string[]): Promise<Array<{type, content}>>
  ```
  Uses `inArray(evidence.id, ids)`.
- In `generateEpicFull()` stories loop, replace the `evidenceSummary` assignment:
  ```
  const storyEvidence = await this.getEvidenceByIds(story.evidenceIds);
  const evidenceSummary = storyEvidence.slice(0, 10)
    .map(e => `- [${e.type}] ${e.content}`).join('\n');
  ```
- Import `inArray` from `drizzle-orm` (add to existing import line)

**Verify:** Generated user stories reference actual feature details instead of being generic.

---

### 5. LLM Acceptance Criteria Structuring

**Problem:** `structureAcceptanceCriteria()` wraps non-GWT criteria in placeholder "Given the feature is implemented / When the user interacts / Then [criterion]". This is filler.

**Files to change:**
- New file `lib/prompts/acceptanceCriteria.ts` — export `buildAcceptanceCriteriaPrompt(storyTitle, rawCriteria[], evidenceSummary)`. Instruct LLM to: group related criteria into scenarios, generate descriptive titles, write real GWT clauses, return JSON array.
- `lib/services/TicketService.ts` — add `structureAcceptanceCriteriaViaLLM(storyTitle, criteria[], evidenceSummary): Promise<AcceptanceCriterionStructured[]>`. Calls LLM with the prompt, parses response. On failure, falls back to existing regex `structureAcceptanceCriteria()`.
- In `generateEpicFull()` stories loop, call the LLM version instead of the regex version.

**Verify:** Exported AC section has meaningful titles and GWT that reflect actual requirements.

---

### 6. User Story Retry + Cache

**Problem:** One LLM call per story, no retry, no cache. 8 stories = 8 sequential GPT-4o calls. Any failure → `userStory: null` silently.

**Files to change:**
- `lib/services/TicketService.ts` — modify `generateUserStoryNarrative()`:
  - Add retry loop (2 attempts, 2s delay between)
  - Validate parsed JSON shape (`persona && action && benefit`) before returning
- `lib/db/schema.ts` — add `'user_story_narrative'` to `check_output_type` constraint (requires migration)
- `drizzle/migrations/` — new migration updating the constraint
- `lib/services/TicketService.ts` — before LLM call, check `featureOutputs` for cached `user_story_narrative`. After successful LLM call, insert into `featureOutputs`. This requires knowing the child feature ID — same map from item 2.

**Verify:** Export same epic twice → second time uses cache (no LLM calls for user stories). Kill network → retry fires, then falls back gracefully.

---

## Batch C — Enrichment Completeness

### 7. Story-Level Enrichment

**Problem:** Enrichment is fetched once for the epic and copied identically to every story. Child features may have their own enrichment data.

**Files to change:**
- `lib/services/TicketService.ts` — in `generateEpicFull()` stories loop, if a child feature ID is known, call `getEnrichmentData(childFeatureId)`. If it returns results, use those instead of the epic-level enrichment for that story.
- Depends on the `story.title → childFeature.id` map from item 2.

**Verify:** If child features have enrichment, their stories show different legal/accessibility sections than sibling stories.

---

### 8. External Dependencies Extraction

**Problem:** `mapEnrichmentToTemplateSections()` always returns `dependencies: []`. The W2C-22 template expects entries like "Evergent Authentication Service (MANDATORY)".

**Files to change:**
- `lib/services/TicketService.ts` — in `mapEnrichmentToTemplateSections()`, after the switch statement, add:
  ```
  if (source.mandatory) {
    dependencies.push({
      service: source.sourceName,
      description: contentLines[0] || source.content,
      criticality: 'MANDATORY',
    });
  }
  ```
- Also check for non-mandatory sources with `sourceType === 'other'` and assign criticality `'OPTIONAL'`.

**Verify:** Features with mandatory enrichment sources → Dependencies section populated.

---

### 9. Story Dependencies from Flow Evidence

**Problem:** `storyDependencies` is always `null`. The W2C-22 template shows: "User must have completed registration and email verification before login."

**Files to change:**
- `lib/services/TicketService.ts` — add `inferStoryDependencies(childFeatureId?: string): Promise<string | null>`. Query flow-type evidence for the child feature. Join content with "; ". Return null if no flow evidence.
- In `generateEpicFull()` stories loop, call this and assign to `storyDependencies`.

**Verify:** Features with flow evidence → Dependencies subsection appears in story markdown.

---

## Optional — Unit Tests

Deferred. When ready, these are the highest-value tests to write:

| File | What to test |
|------|-------------|
| `tests/keyGenerator.test.ts` | Sequential keys, prefix, counter state |
| `tests/markdownTemplateFormatter.test.ts` | Each section renders, empty sections omitted, matches W2C-22 |
| `tests/structureAcceptanceCriteria.test.ts` | GWT parsing, fallback, titles |
| `tests/mapEnrichmentToTemplateSections.test.ts` | sourceType routing, content splitting |

All pure functions, no mocking needed.

---

## Implementation Order Summary

| # | Item | Batch | Touches | DB Migration |
|---|------|-------|---------|-------------|
| 1 | Persistent key counter | A | schema, TicketService, API route | Yes |
| 2 | HLR from evidence data | A | TicketService | No |
| 3 | API endpoints from ApiContract | A | TicketService | No |
| 4 | Evidence summary for LLM prompt | B | TicketService | No |
| 5 | LLM acceptance criteria | B | new prompt file, TicketService | No |
| 6 | User story retry + cache | B | TicketService, schema | Yes |
| 7 | Story-level enrichment | C | TicketService | No |
| 8 | External dependencies | C | TicketService | No |
| 9 | Story dependencies from flow | C | TicketService | No |
| — | Unit tests | Optional | new test files | No |

---

## Verification (All Items)

After each batch:
- `pnpm typecheck` — zero errors
- `pnpm lint` — zero new warnings
- `pnpm build` — compiles
- Manual: export a feature with enrichment data as markdown, verify affected sections are non-empty and contain real data
