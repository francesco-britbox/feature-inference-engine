# AI Feature Inference & Reconstruction Platform
## Automatically infer product features from scattered documents

---

## Overview

This system automatically:
1. **Ingests** heterogeneous artifacts (screenshots, APIs, Jira tickets, PDFs, YAML, Markdown)
2. **Extracts** atomic evidence from each source using format-specific extractors + OpenAI Vision
3. **Embeds** evidence using text-embedding-3-large (3072 dimensions)
4. **Clusters** related evidence using DBSCAN over cosine similarity
5. **Infers** user-facing features via LLM analysis of each cluster
6. **Validates** across clusters, merging duplicate features
7. **Builds hierarchy** (epic > story > task) using LLM classification
8. **Scores confidence** (0-1) based on evidence strength and coverage
9. **Generates** platform-targeted Jira ticket folders with epics, stories, subtasks, and API contracts

**Domain**: OTT platform feature reconstruction
**Goal**: Go from messy docs to Jira-ready tickets

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
git clone https://github.com/francesco-britbox/feature-inference-engine.git
cd feature-inference-engine

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your OPENAI_API_KEY

# Start Docker services (PostgreSQL + Chroma)
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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 18, TailwindCSS, shadcn/ui |
| Backend | Node.js 20, TypeScript 5, Next.js API Routes |
| Database | PostgreSQL 16 + pgvector |
| Vector DB | Chroma (local) |
| ORM | Drizzle ORM |
| AI | OpenAI GPT-4 Vision, GPT-4o, text-embedding-3-large |
| Visualization | D3.js (force-directed graph) |
| Container | Docker Compose |
| Testing | Vitest |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard home |
| `/upload` | Upload documents (drag & drop, multi-file) |
| `/documents` | Document list with processing status |
| `/evidence` | Evidence explorer with type filters and search |
| `/features` | Hierarchical feature tree (epics > stories > tasks) |
| `/features/[id]` | Feature detail with linked evidence and relationships |
| `/features/[id]/export` | Export feature as Jira-ready tickets |
| `/features/graph` | Interactive D3 force-directed relationship graph |
| `/jira` | Jira ticket generation with platform targeting |
| `/status` | System status and health |
| `/settings` | Application settings |
| `/debug/correlation` | Debug correlation data |

---

## API Endpoints

### Documents
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document detail
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/status` - Get processing status
- `POST /api/documents/:id/reprocess` - Reprocess document

### Upload
- `POST /api/upload` - Upload document files

### Evidence
- `GET /api/evidence` - List evidence with filters

### Features
- `GET /api/features` - List features (filters: status, type, minConfidence, parent)
- `POST /api/features` - Create a feature
- `GET /api/features/:id` - Get feature with linked evidence
- `PATCH /api/features/:id` - Update feature (name, description, status)
- `DELETE /api/features/:id` - Delete feature
- `GET /api/features/:id/export` - Export feature as tickets
- `GET /api/features/:id/hierarchy` - Get hierarchy (ancestors, descendants)
- `PUT /api/features/:id/parent` - Set parent feature
- `DELETE /api/features/:id/parent` - Remove parent
- `GET /api/features/graph` - Get all nodes and links for graph visualization

### Inference
- `POST /api/inference/run` - Run full inference pipeline (embed > cluster > infer > merge > hierarchy > score > relate)

### Jira Export
- `POST /api/jira/generate` - Generate Jira ticket folder structure
- `GET /api/jira/download/:sessionId` - Download generated tickets as ZIP
- `POST /api/jira/clear` - Clear generated ticket sessions

### System
- `GET /api/health` - Health check
- `GET /api/stats` - System statistics (counts, processing status)
- `POST /api/system/reset` - Reset all data
- `GET /api/queue/activity` - Queue activity log
- `POST /api/queue/process` - Trigger queue processing

---

## Project Structure

```
/app                          # Next.js App Router
  /api                       # API routes (see endpoints above)
  /upload                    # Upload UI
  /documents                 # Document management
  /evidence                  # Evidence explorer
  /features                  # Feature tree, detail, export
    /graph                   # Force-directed graph visualization
  /jira                      # Jira ticket generation
  /status                    # System status
  /settings                  # Settings
  /debug                     # Debug tools

/lib                          # Business logic
  /ai                        # OpenAI client, prompts
  /db                        # Database schema (Drizzle) & client
  /services                  # Core services
    /extractors              # Format-specific extractors
    /enrichment              # Platform guidelines, security, legal
  /prompts                   # LLM prompt templates
  /types                     # TypeScript type definitions
  /constants                 # UI and app constants
  /utils                     # Utilities (logger, errors, similarity)

/components                   # React components
  /ui                        # shadcn/ui base components
  ForceGraph.tsx             # D3 force-directed graph
  ForceGraphControls.tsx     # Graph filter controls
  ForceGraphLegend.tsx       # Graph legend overlay
  ActivityMonitor.tsx        # Processing activity monitor
  JiraTreeSelector.tsx       # Jira export tree selector

/drizzle                      # Database migrations

/tests                        # Test files
  /unit                      # Unit tests (Vitest)

/docs                         # Implementation documentation
```

---

## Core Services

| Service | Responsibility |
|---------|---------------|
| `ExtractionService` | Orchestrates format-specific evidence extraction |
| `ScreenshotExtractor` | Extracts UI evidence via OpenAI Vision |
| `ApiSpecExtractor` | Parses JSON/YAML API specs into endpoint/payload evidence |
| `JiraExtractor` | Extracts requirements from Jira CSV exports |
| `PdfExtractor` | Extracts evidence from PDF documents |
| `EmbeddingService` | Generates text-embedding-3-large vectors |
| `ClusteringService` | DBSCAN clustering over cosine similarity |
| `FeatureInferenceService` | LLM-based feature hypothesis from clusters + dedup |
| `FeatureHierarchyService` | LLM-based epic/story/task classification |
| `ConfidenceScorer` | Evidence-weighted confidence calculation |
| `RelationshipBuilder` | Builds feature-evidence graph with typed edges |
| `TicketService` | Generates hierarchical Jira ticket structures |
| `JiraFolderGeneratorService` | Creates downloadable folder/ZIP output |
| `PlatformFilterService` | Filters tickets by target platform |
| `EnrichmentOrchestrator` | Enriches features with platform guidelines, security, legal |

---

## Core Algorithm

```
Upload documents
  |
  v
Extract evidence (format-specific extractors + OpenAI Vision)
  |
  v
Generate embeddings (text-embedding-3-large, 3072 dims)
  |
  v
Cluster evidence (DBSCAN over cosine similarity)
  |
  v
Generate feature hypotheses (GPT-4o per cluster)
  |
  v
Validate & merge duplicates (name similarity + embedding pre-filter + LLM)
  |
  v
Build hierarchy (LLM classifies epic/story/task, assigns parents)
  |
  v
Calculate confidence scores (evidence type weights + coverage)
  |
  v
Build relationships (feature-evidence graph with typed edges)
  |
  v
Human review (confirm/reject features)
  |
  v
Generate Jira tickets (platform-targeted epics, stories, subtasks)
```

---

## Database Schema

### Core Tables

- **documents** - Uploaded files with processing status
- **processing_jobs** - Persistent extraction queue (zero data loss)
- **evidence** - Atomic facts with 3072-dim embeddings (pgvector)
- **features** - Inferred capabilities with hierarchy (epic/story/task)
- **feature_evidence** - Relationship graph (implements/supports/constrains/extends + strength)
- **feature_outputs** - Generated artifacts (epics, stories, API contracts)
- **enrichment_sources** - Platform guidelines, legal, security requirements
- **guideline_cache** - Cached external guidelines (90-day TTL)

See [Database Schema](docs/03_DATABASE_SCHEMA.md) for full details.

---

## Scripts

```bash
# Development
pnpm dev                 # Start dev server
pnpm build               # Build for production
pnpm start               # Start production server

# Code Quality
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint

# Testing
pnpm test                # Run all tests
pnpm test:watch          # Run tests in watch mode

# Database
pnpm db:generate         # Generate migrations
pnpm db:migrate          # Run migrations
pnpm db:push             # Push schema changes (dev only)
pnpm db:studio           # Open Drizzle Studio

# Docker
docker-compose up -d     # Start PostgreSQL + Chroma
docker-compose down      # Stop services
docker-compose logs -f   # View logs
```

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://engine:password@localhost:5432/feature_engine
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-...

# Optional
DB_PASSWORD=your_password
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
MAX_FILE_SIZE_MB=50
MAX_FILES_PER_BATCH=20
MAX_RETRIES=3
EXTRACTION_TIMEOUT_MS=60000
```

---

## Troubleshooting

### Docker Issues

```bash
# Restart services
docker-compose restart

# View logs
docker-compose logs -f feature-engine-app
docker-compose logs -f feature-engine-postgres

# Reset everything (destroys data)
docker-compose down -v
docker-compose up -d
pnpm db:migrate
```

### Database Issues

```bash
# Reset database schema
pnpm db:push --force

# Check connection
docker exec -it feature-engine-postgres psql -U engine -d feature_engine
```

### OpenAI API Issues

- Check API key in `.env.local`
- Verify rate limits at https://platform.openai.com/usage
- Check API status at https://status.openai.com

---

## Documentation

All implementation docs are in `/docs`:

1. **[Architecture](docs/01_ARCHITECTURE.md)** - System design, components, data flow
2. **[Tech Stack](docs/02_TECH_STACK.md)** - Technologies, versions, configurations
3. **[Database Schema](docs/03_DATABASE_SCHEMA.md)** - PostgreSQL tables, indexes, queries
4. **[Coding Principles](docs/04_CODING_PRINCIPLES.md)** - TypeScript standards, file structure
5. **[Git Strategy](docs/05_GIT_STRATEGY.md)** - Branching, commits, PRs
6. **[Implementation Phases](docs/06_IMPLEMENTATION_PHASES.md)** - 9 phases with dependencies
7. **[Extraction Rules](docs/07_EXTRACTION_RULES.md)** - Per-format evidence extraction logic
8. **[Jira Platform Targeting](docs/07_PHASE_7_5_JIRA_PLATFORM_TARGETING.md)** - Platform-specific ticket generation

---

## License

[Add license]
