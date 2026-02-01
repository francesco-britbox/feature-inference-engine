# Project Documentation Index

## AI Feature Inference & Reconstruction Platform

This document serves as the central reference for all project documentation.

---

## Quick Links

- **[README](README.md)** - Quick start, setup, scripts
- **[Original Vision](ai_feature_inference_reconstruction_platform_vision_architecture_and_implementation_guide.md)** - Initial requirements document
- **[Claude Config](.claude/claude.md)** - Claude Code configuration and context

---

## Implementation Documentation

Located in `/docs`:

1. **[Architecture](docs/01_ARCHITECTURE.md)**
   - High-level system design
   - Component overview
   - Docker architecture
   - Data flow diagrams
   - Core algorithm (multi-pass inference)

2. **[Tech Stack](docs/02_TECH_STACK.md)**
   - All technologies and versions
   - Why each technology was chosen
   - Configuration details
   - Environment variables

3. **[Database Schema](docs/03_DATABASE_SCHEMA.md)**
   - Complete PostgreSQL schema
   - Drizzle ORM definitions
   - Indexes and constraints
   - Common queries
   - Migration strategy

4. **[Coding Principles](docs/04_CODING_PRINCIPLES.md)**
   - TypeScript standards
   - File structure conventions
   - Naming conventions
   - Error handling patterns
   - Testing standards

5. **[Git Strategy](docs/05_GIT_STRATEGY.md)**
   - Branch structure
   - Commit conventions
   - PR guidelines
   - Merge strategy
   - Release process

6. **[Implementation Phases](docs/06_IMPLEMENTATION_PHASES.md)**
   - 9 phases with detailed tasks
   - Dependencies and parallelization
   - Timeline estimates
   - Success criteria per phase
   - Risk mitigation

7. **[Extraction Rules](docs/07_EXTRACTION_RULES.md)**
   - Screenshot extraction (OpenAI Vision)
   - API spec extraction (JSON/YAML)
   - Jira CSV extraction
   - PDF/Markdown extraction
   - Evidence quality rules

---

## Project Structure

```
/app                      # Application code
/docs                     # All implementation documentation
/drizzle                  # Database migrations (TBD)
/tests                    # Test files (TBD)
/components               # React components (TBD)
/lib                      # Business logic (TBD)
/docker                   # Docker configurations (TBD)
.claude/                  # Claude Code configuration
```

---

## Current Status

**Phase**: Phase 0 - Foundation (Initialization)

**Next Steps**: See [Implementation Phases](docs/06_IMPLEMENTATION_PHASES.md#phase-0-foundation)

---

## Key Concepts

- **Feature**: User-facing capability (e.g., "User Login")
- **Evidence**: Atomic fact from documents (e.g., "email input field")
- **Graph Relationships**: Weighted edges connecting evidence to features
- **Confidence Score**: 0-1 probability that a feature exists
- **Multi-Pass Inference**: Extract → Embed → Cluster → Infer → Validate

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 18, TailwindCSS |
| Backend | Node.js 20, TypeScript 5 |
| Database | PostgreSQL 16 + pgvector |
| Vector DB | Chroma (local) |
| AI | OpenAI (Vision, GPT-4o, Embeddings) |
| Container | Docker Compose |

---

## Environment Setup

See [README.md](README.md#quick-start) for installation instructions.

Required:
- Node.js 20.x LTS
- Docker & Docker Compose
- pnpm 9.x
- OpenAI API key

---

## Development Workflow

1. Read relevant docs from `/docs`
2. Create feature branch from phase branch
3. Implement following coding principles
4. Write tests
5. Create PR with description
6. Merge after approval

See [Git Strategy](docs/05_GIT_STRATEGY.md) for details.

---

## Support

All documentation is self-contained in this repository.

For implementation questions, refer to:
- Architecture decisions → [Architecture](docs/01_ARCHITECTURE.md)
- Code standards → [Coding Principles](docs/04_CODING_PRINCIPLES.md)
- Phase tasks → [Implementation Phases](docs/06_IMPLEMENTATION_PHASES.md)

---

**Last Updated**: 2026-02-01
