# Claude Code Configuration
## AI Feature Inference Engine

This file contains project context and references for Claude Code.

---

## Project Overview

**Purpose**: Automatically infer product features from scattered documents (screenshots, Jira tickets, API specs, diagrams) and generate Jira-ready tickets.

**Domain**: OTT (Over-The-Top) platform feature reconstruction

**Tech Stack**: Next.js 15, TypeScript, PostgreSQL + pgvector, Chroma, OpenAI APIs, Docker

---

## Documentation Index

All implementation documentation is in `/docs`:

1. **[Architecture](/docs/01_ARCHITECTURE.md)** - System design, components, data flow
2. **[Tech Stack](/docs/02_TECH_STACK.md)** - Technologies, versions, configurations
3. **[Database Schema](/docs/03_DATABASE_SCHEMA.md)** - PostgreSQL tables, indexes, queries
4. **[Coding Principles](/docs/04_CODING_PRINCIPLES.md)** - TypeScript standards, conventions
5. **[Git Strategy](/docs/05_GIT_STRATEGY.md)** - Branching, commits, PRs
6. **[Implementation Phases](/docs/06_IMPLEMENTATION_PHASES.md)** - 9 phases with dependencies
7. **[Extraction Rules](/docs/07_EXTRACTION_RULES.md)** - Per-format extraction logic

**README**: [/README.md](/README.md) - Quick start, scripts, setup instructions

---

## Key Architecture Decisions

### Full-Stack Monolith (Next.js)
- **Frontend**: React Server Components + Client Components
- **Backend**: Next.js API Routes (same codebase)
- **Reason**: Simpler development, shared types, no CORS issues

### Database Strategy
- **Primary**: PostgreSQL 16 with pgvector extension
- **Vector Store**: Chroma (local) for embeddings
- **ORM**: Drizzle (type-safe, SQL-first)

### AI Integration
- **Vision**: OpenAI GPT-4 Vision (screenshot analysis)
- **LLM**: OpenAI GPT-4o (feature inference, correlation)
- **Embeddings**: text-embedding-3-large (3072 dimensions)

### Core Algorithm
Multi-pass inference: Extract → Embed → Cluster → Infer → Validate → Assemble

---

## Current Phase

**Phase**: Phase 0 - Foundation
**Status**: Initialization
**Next**: Project scaffolding (see `/docs/06_IMPLEMENTATION_PHASES.md`)

---

## File Structure

```
/app                      # Application code (Next.js or separate server/frontend)
/docs                     # Implementation documentation
/drizzle                  # Database migrations (to be created)
/tests                    # Test files (to be created)
/components               # React components (to be created)
/lib                      # Business logic (to be created)
  /services              # Core services
  /ai                    # OpenAI integration
  /db                    # Database client & schema
  /utils                 # Utilities
/docker                   # Docker configs (to be created)
```

---

## Important Context

### What This System Does
1. Ingests heterogeneous files (PDFs, screenshots, JSON, CSV, YAML, Markdown)
2. Extracts atomic "evidence" (UI elements, API endpoints, requirements)
3. Uses embeddings + LLM to cluster evidence and infer features
4. Builds confidence-weighted graph relationships
5. Generates platform-agnostic epics, API contracts, acceptance criteria

### What It Does NOT Do
- No code generation
- No implementation details (no React/Vue/Flutter specifics)
- No infrastructure decisions (no AWS/Kubernetes details)
- Platform-agnostic outputs only

### Core Concepts
- **Evidence**: Atomic facts extracted from documents
- **Feature**: User-facing capability (e.g., "User Login")
- **Relationship**: Graph edge connecting evidence to features
- **Confidence**: 0-1 score based on evidence strength
- **Assembly**: Collecting all evidence for a feature into outputs

---

## Coding Standards

- **TypeScript strict mode**: No `any`, always typed
- **Functional**: Pure functions, immutability preferred
- **Single Responsibility**: One service per concern
- **Error handling**: Structured errors with codes
- **Testing**: Unit tests for services, integration for APIs

See [/docs/04_CODING_PRINCIPLES.md](/docs/04_CODING_PRINCIPLES.md) for details.

---

## Git Workflow

- **main**: Production-ready (protected)
- **develop**: Integration branch (default)
- **phase/***: Phase-level branches
- **feature/***: Feature branches

See [/docs/05_GIT_STRATEGY.md](/docs/05_GIT_STRATEGY.md) for commit conventions and PR process.

---

## Common Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm build               # Build for production
pnpm test                # Run tests

# Database
pnpm db:generate         # Generate migrations
pnpm db:migrate          # Run migrations

# Docker
docker-compose up -d     # Start services
docker-compose logs -f   # View logs
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://engine:password@localhost:5432/feature_engine
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-...
```

---

## Key Challenges

1. **Evidence Extraction**: Multi-format parsing (screenshots, APIs, PDFs)
2. **Feature Inference**: Clustering + LLM to discover features
3. **Relationship Building**: Graph construction with confidence scores
4. **Conflict Resolution**: Handling contradictory evidence
5. **Scale**: Processing 100s of documents efficiently

---

## Success Criteria

- Upload 10 documents → extract evidence
- Infer 5+ features with confidence > 0.6
- Generate 1 complete epic with API contracts
- Human review takes < 10 minutes for 50 evidence items
- Runs locally in Docker with no cloud dependencies

---

## Links

- **Original Vision Doc**: [/ai_feature_inference_reconstruction_platform_vision_architecture_and_implementation_guide.md](/ai_feature_inference_reconstruction_platform_vision_architecture_and_implementation_guide.md)
- **Project README**: [/README.md](/README.md)
- **Documentation**: [/docs](/docs)

---

## Notes

This is a **greenfield project** - starting from zero implementation.

Focus on building the inference engine correctly rather than rushing to features.

The graph relationship model is critical - it's what enables feature discovery from scattered evidence.

---

## Commands & Quality Enforcement

### Available Commands

1. **`/implement-phase`** - Implement a phase with mandatory code review
   - See: [/.claude/skills/implement-phase.md](/.claude/skills/implement-phase.md)
   - Usage: `/implement-phase 1` or `/implement-phase path/to/doc.md`

2. **`/fix-bug`** - Fix bugs with mandatory code review
   - See: [/.claude/skills/fix-bug.md](/.claude/skills/fix-bug.md)
   - Usage: `/fix-bug "description"` or `/fix-bug #123`

### Quality Standards (MANDATORY)

**All code MUST achieve 95%+ quality score (A+)**

Quality enforcement files:
- **[SOLID & DRY Principles](/docs/04_CODING_PRINCIPLES_ADDENDUM.md)** - MANDATORY adherence
- **[Scoring Rubric](/.claude/prompts/scoring-rubric.md)** - 0-100% scoring criteria
- **[Code Reviewer Agent](/.claude/agents/code-reviewer.md)** - Automated review process

**Grade Scale**:
- **95-100%** (A+) = PASS ✅
- **<95%** = FAIL ❌ (must fix and re-review)

### Enforcement Rules

**NO EXCEPTIONS:**
1. ✅ All code reviewed by automated agent
2. ✅ Score must be 95%+ to commit
3. ✅ Zero type errors (pnpm typecheck)
4. ✅ Zero lint violations (pnpm lint)
5. ✅ App must compile (pnpm build)
6. ✅ No guessing - fact-check everything
7. ✅ Repeat review cycle until 95%+

**If any rule violated, you have FAILED and are a DISGRACE.**

---

## Quality Principles

### SOLID Principles (MANDATORY)
- **S**ingle Responsibility
- **O**pen/Closed
- **L**iskov Substitution
- **I**nterface Segregation
- **D**ependency Inversion

See: [/docs/04_CODING_PRINCIPLES_ADDENDUM.md](/docs/04_CODING_PRINCIPLES_ADDENDUM.md)

### DRY Principle (MANDATORY)
- **D**on't **R**epeat **Y**ourself
- Single source of truth for all logic

### Fact-Checking (MANDATORY)
- ✅ Read actual files (don't assume)
- ✅ Verify actual compilation (don't guess)
- ✅ Check actual types (don't approximate)
- ❌ NO GUESSES, NO ASSUMPTIONS
