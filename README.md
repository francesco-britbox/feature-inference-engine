# AI Feature Inference & Reconstruction Platform
## Automatically infer product features from scattered documents

---

## Overview

This system automatically:
1. **Ingests** heterogeneous artifacts (screenshots, APIs, Jira tickets, docs)
2. **Extracts** atomic evidence from each source
3. **Infers** user-facing features using AI clustering and LLM analysis
4. **Correlates** all evidence to features with confidence scores
5. **Generates** platform-agnostic epics, API contracts, and acceptance criteria

**For**: OTT platform feature reconstruction
**Goal**: Create Jira tickets from messy, scattered documentation

---

## Documentation

All implementation docs are in `/docs`:

1. **[Architecture](docs/01_ARCHITECTURE.md)** - System design, components, data flow
2. **[Tech Stack](docs/02_TECH_STACK.md)** - Technologies, versions, configurations
3. **[Database Schema](docs/03_DATABASE_SCHEMA.md)** - PostgreSQL tables, indexes, queries
4. **[Coding Principles](docs/04_CODING_PRINCIPLES.md)** - TypeScript standards, file structure, testing
5. **[Git Strategy](docs/05_GIT_STRATEGY.md)** - Branching, commits, PRs, releases
6. **[Implementation Phases](docs/06_IMPLEMENTATION_PHASES.md)** - 9 phases with dependencies
7. **[Extraction Rules](docs/07_EXTRACTION_RULES.md)** - Per-format evidence extraction logic

---

## Quick Start

### Prerequisites

- Node.js 20.x LTS
- Docker & Docker Compose
- pnpm 9.x
- OpenAI API key

### Installation

```bash
# Clone repository
git clone <repo-url>
cd requirement-app

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your OPENAI_API_KEY

# Start Docker services
docker-compose up -d

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Access

- **App**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Chroma**: http://localhost:8000

---

## Project Structure

```
/app                      # Next.js App Router
  /api                   # API routes
  /upload                # Upload UI
  /features              # Feature management UI
  /evidence              # Evidence explorer

/lib                      # Business logic
  /services              # Core services (Extraction, Inference, etc.)
  /ai                    # OpenAI client & prompts
  /db                    # Database schema & client
  /utils                 # Utilities

/components               # React components
  /ui                    # shadcn/ui components
  /features              # Feature-specific components

/docs                     # Documentation (you are here)

/drizzle                  # Database migrations

/tests                    # Test files
  /unit
  /integration
  /fixtures              # Test documents

/docker                   # Docker configs
```

---

## Development Workflow

### Phase-Based Development

See [Implementation Phases](docs/06_IMPLEMENTATION_PHASES.md) for detailed breakdown.

**Current Phase**: Phase 0 (Foundation)

### Git Workflow

```bash
# Create phase branch
git checkout -b phase/1-ingestion

# Create feature branch
git checkout -b feature/file-upload

# Make changes, commit
git add .
git commit -m "feat(ingestion): add file upload API"

# Push and create PR
git push origin feature/file-upload
```

See [Git Strategy](docs/05_GIT_STRATEGY.md) for details.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 18, TailwindCSS |
| Backend | Node.js 20, TypeScript 5 |
| Database | PostgreSQL 16 + pgvector |
| Vector DB | Chroma (local) |
| ORM | Drizzle ORM |
| AI | OpenAI (GPT-4 Vision, GPT-4o, Embeddings) |
| Container | Docker Compose |

See [Tech Stack](docs/02_TECH_STACK.md) for full details.

---

## Core Algorithm

### Multi-Pass Feature Inference

```
1. Upload documents
   ↓
2. Extract evidence (format-specific)
   ↓
3. Generate embeddings
   ↓
4. Cluster evidence (DBSCAN)
   ↓
5. Generate feature hypotheses (LLM)
   ↓
6. Validate across clusters
   ↓
7. Calculate confidence scores
   ↓
8. Present for human review
   ↓
9. Assemble feature knowledge
   ↓
10. Generate tickets
```

See [Architecture](docs/01_ARCHITECTURE.md) for detailed algorithm.

---

## Database Schema

### Core Tables

- **documents** - Uploaded files
- **evidence** - Atomic facts extracted
- **features** - Inferred capabilities
- **feature_evidence** - Relationship graph
- **feature_outputs** - Generated artifacts

See [Database Schema](docs/03_DATABASE_SCHEMA.md) for full SQL.

---

## Scripts

```bash
# Development
pnpm dev                 # Start dev server
pnpm build               # Build for production
pnpm start               # Start production server

# Database
pnpm db:generate         # Generate migrations
pnpm db:migrate          # Run migrations
pnpm db:push             # Push schema changes (dev only)
pnpm db:studio           # Open Drizzle Studio

# Testing
pnpm test                # Run all tests
pnpm test:unit           # Run unit tests
pnpm test:integration    # Run integration tests
pnpm test:e2e            # Run E2E tests

# Code Quality
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint
pnpm lint:fix            # Fix linting issues
pnpm format              # Prettier formatting

# Docker
docker-compose up -d     # Start services
docker-compose down      # Stop services
docker-compose logs -f   # View logs
```

---

## API Endpoints

### Upload
- `POST /api/upload` - Upload document

### Extraction
- `POST /api/extract` - Trigger extraction for document
- `GET /api/evidence` - List all evidence
- `GET /api/evidence/:id` - Get evidence by ID

### Features
- `GET /api/features` - List features (with filters)
- `GET /api/features/:id` - Get feature details
- `PATCH /api/features/:id` - Update feature
- `POST /api/features/:id/merge` - Merge with another feature
- `POST /api/features/:id/confirm` - Confirm feature
- `DELETE /api/features/:id` - Reject/delete feature

### Export
- `GET /api/features/:id/export?format=json|md|csv` - Export tickets

---

## Testing

### Run Tests

```bash
# All tests
pnpm test

# Specific suites
pnpm test:unit
pnpm test:integration

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

```
/tests
  /unit
    ExtractionService.test.ts
    FeatureInferenceService.test.ts
  /integration
    api.test.ts
  /fixtures
    screenshots/
    api-specs/
    jira/
    docs/
```

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://engine:password@localhost:5432/feature_engine
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-...

# Optional
NODE_ENV=development
LOG_LEVEL=debug
MAX_FILE_SIZE_MB=50
```

---

## Troubleshooting

### Docker Issues

```bash
# Restart services
docker-compose restart

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Reset everything
docker-compose down -v
docker-compose up -d
```

### Database Issues

```bash
# Reset database
pnpm db:push --force

# Check connection
docker exec -it postgres psql -U engine -d feature_engine
```

### OpenAI API Issues

- Check API key in `.env.local`
- Verify rate limits
- Check API status: https://status.openai.com

---

## Contributing

See [Coding Principles](docs/04_CODING_PRINCIPLES.md) and [Git Strategy](docs/05_GIT_STRATEGY.md).

### PR Checklist

- [ ] Tests pass
- [ ] TypeScript compiles
- [ ] No linter warnings
- [ ] Documentation updated
- [ ] PR description filled

---

## License

[Add license]

---

## Roadmap

### Phase 0 (Week 1) - Foundation ✓
- [ ] Project setup
- [ ] Database schema
- [ ] Docker configuration

### Phase 1 (Week 2) - Ingestion
- [ ] File upload API
- [ ] Storage service
- [ ] Processing queue

### Phase 2-3 (Weeks 3-4) - Extraction
- [ ] Screenshot extractor
- [ ] API spec extractor
- [ ] Jira extractor
- [ ] PDF extractor
- [ ] Embedding service

### Phase 4 (Weeks 5-6) - Inference
- [ ] Clustering
- [ ] Feature hypothesis
- [ ] Confidence scoring
- [ ] Relationship building

### Phase 5 (Week 7) - UI
- [ ] Upload interface
- [ ] Evidence explorer
- [ ] Feature review

### Phase 6-7 (Weeks 8-9) - Output
- [ ] Knowledge assembly
- [ ] Ticket generation
- [ ] Export service

---

## Support

For issues or questions, refer to documentation in `/docs`.

---

**Built with Claude Code** 🤖
