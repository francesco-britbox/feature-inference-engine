# System Architecture
## AI Feature Inference Engine for OTT Platforms

---

## 1. High-Level Design

```
┌─────────────────────────────────────────────────┐
│              Next.js Application                 │
│  ┌──────────────┐      ┌─────────────────────┐ │
│  │   Frontend   │◄────►│   API Routes        │ │
│  │  (Evidence   │      │  /api/upload        │ │
│  │   Review UI) │      │  /api/extract       │ │
│  └──────────────┘      │  /api/infer         │ │
│                        │  /api/features      │ │
│                        └─────────┬───────────┘ │
└──────────────────────────────────┼─────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌────────────────┐      ┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL   │      │  Inference Engine │    │  Vector Store    │
│                │      │                   │    │  (Chroma Local)  │
│  • Features    │◄────►│  • Extractor      │◄──►│                  │
│  • Evidence    │      │  • Correlator     │    │  • Evidence      │
│  • Relationships│     │  • Assembler      │    │    embeddings    │
│  • Documents   │      │  • Scorer         │    │                  │
└────────────────┘      └──────────────────┘    └──────────────────┘
         │                         │
         │                         ▼
         │              ┌──────────────────┐
         └─────────────►│   AI Services    │
                        │  • OpenAI Vision │
                        │  • OpenAI LLM    │
                        │  • Embeddings    │
                        └──────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │  Local Storage   │
                        │  /app/docs/      │
                        │  • PDFs          │
                        │  • Screenshots   │
                        │  • JSON exports  │
                        └──────────────────┘
```

---

## 2. Component Overview

### 2.1 Next.js Application Layer

**Purpose**: Unified full-stack application serving both UI and API

**Components**:
- **Frontend**: React-based UI for evidence review, feature management
- **API Routes**: RESTful endpoints for all operations
- **Server Components**: Server-side rendering for initial data loading

**Key Routes**:
- `/api/upload` - File upload endpoint
- `/api/extract` - Trigger extraction pipeline
- `/api/infer` - Run feature inference
- `/api/features` - CRUD operations on features
- `/api/feature-evidence` - Manage relationships

---

### 2.2 Inference Engine

**Purpose**: Core logic for extracting, correlating, and assembling feature knowledge

**Services**:

1. **Extractor**
   - Per-format extraction logic
   - OpenAI Vision for screenshots
   - Structural parsing for JSON/YAML
   - CSV parsing for Jira exports
   - Text+LLM for PDFs/Markdown

2. **Correlator**
   - Embedding generation
   - DBSCAN clustering
   - LLM-based feature hypothesis
   - Cross-cluster validation
   - Duplicate detection

3. **Assembler**
   - Evidence aggregation per feature
   - API contract synthesis
   - Requirements consolidation
   - Acceptance criteria generation

4. **Scorer**
   - Confidence calculation
   - Signal weight application
   - Threshold-based classification

---

### 2.3 PostgreSQL Database

**Purpose**: Relational storage for structured data and relationships

**Tables**:
- `documents` - Uploaded files metadata
- `evidence` - Atomic facts extracted from documents
- `features` - Inferred user-facing capabilities
- `feature_evidence` - Graph relationships with strength scores
- `feature_outputs` - Generated artifacts (epics, stories, contracts)

**Extensions**:
- `pgvector` - Vector similarity search for embeddings

---

### 2.4 Chroma Vector Store

**Purpose**: Fast semantic search over evidence embeddings

**Usage**:
- Store evidence embeddings (3072 dimensions)
- K-NN retrieval for clustering
- Similarity search for related evidence

**Why Chroma**:
- Embedded (no separate server needed)
- Simple Python/TypeScript API
- Local-first deployment

---

### 2.5 AI Services

**OpenAI Vision (GPT-4 Vision)**:
- Screenshot analysis
- Diagram interpretation
- UI element extraction

**OpenAI LLM (GPT-4o)**:
- Feature hypothesis generation
- Evidence relationship inference
- API contract synthesis
- Requirements consolidation

**Embeddings (text-embedding-3-large)**:
- Evidence vectorization
- High-quality 3072-dim embeddings
- Used for clustering and similarity

---

### 2.6 Local File Storage

**Purpose**: Persistent storage for uploaded documents

**Structure**:
```
/app/docs/
  /<document-uuid>/
    original.pdf
    metadata.json
```

**Access**:
- Mounted Docker volume
- Accessible from Next.js app
- Served via API routes (authenticated)

---

## 3. Data Flow

### 3.1 Upload → Extract → Infer

```
User uploads file
    ↓
POST /api/upload
    ↓
Save to /app/docs + DB (documents table)
    ↓
Queue extraction job
    ↓
Route to format-specific extractor
    ↓
Extract evidence → Store in DB (evidence table)
    ↓
Generate embeddings → Store in Chroma + pgvector
    ↓
Trigger inference pipeline
    ↓
Cluster evidence (DBSCAN)
    ↓
LLM generates feature hypotheses
    ↓
Cross-cluster validation
    ↓
Calculate confidence scores
    ↓
Store features + relationships in DB
    ↓
Present in UI for review
```

---

### 3.2 Review → Assemble → Export

```
User reviews features in UI
    ↓
Confirm/merge/reject actions
    ↓
Trigger assembly pipeline
    ↓
Collect all evidence per feature
    ↓
Generate API contracts (from endpoint evidence)
    ↓
Synthesize requirements (from requirement evidence)
    ↓
Generate acceptance criteria (from edge cases)
    ↓
Store outputs in feature_outputs table
    ↓
User previews generated tickets
    ↓
Export as JSON/Markdown/CSV
```

---

## 4. Docker Architecture

### 4.1 Services

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: feature_engine
      POSTGRES_USER: engine
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/data

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - chroma
    volumes:
      - ./docs:/app/docs
    environment:
      DATABASE_URL: postgresql://engine:${DB_PASSWORD}@postgres:5432/feature_engine
      CHROMA_URL: http://chroma:8000
      OPENAI_API_KEY: ${OPENAI_API_KEY}

volumes:
  postgres_data:
  chroma_data:
```

### 4.2 Networking

- All services on same Docker network
- Internal DNS resolution (postgres:5432, chroma:8000)
- Only app exposed to host (port 3000)

---

## 5. Core Algorithm: Multi-Pass Inference

### Phase 1: Extraction (Per Document)
```
Input: Screenshot
Output: Array of evidence objects
```

### Phase 2: Embedding & Clustering
```
- Embed all evidence
- DBSCAN clustering (eps=0.3, min_samples=3)
- Result: Initial evidence groups
```

### Phase 3: Feature Hypothesis (LLM)
```
Per cluster:
- LLM prompt with evidence items
- Output: feature name, confidence, reasoning
```

### Phase 4: Cross-Cluster Validation
```
- Check for duplicate features across clusters
- LLM-based similarity check
- Merge duplicates
```

### Phase 5: Graph Building
```
- Create Feature nodes
- Link Evidence → Feature
- Store relationship types and strength scores
```

---

## 6. Key Design Decisions

### 6.1 Why Next.js?
- Full-stack TypeScript
- API routes eliminate separate backend
- Server-side rendering for performance
- Modern React ecosystem

### 6.2 Why PostgreSQL + pgvector?
- Relational data model fits feature-evidence graph
- pgvector eliminates need for separate vector DB
- ACID compliance for data integrity
- Mature, battle-tested

### 6.3 Why Chroma?
- Simple embedded option
- Good TypeScript support
- Local-first (no cloud dependencies)
- Easy Docker deployment

### 6.4 Why Not RAG?
- Not a chatbot interface
- Need structured inference pipeline
- Evidence is atomic, not document-level
- Embeddings assistive, not authoritative

---

## 7. Scalability Considerations

### Current (Local, Single User)
- All services in Docker Compose
- In-memory job queue
- Single-threaded extraction
- Good for 100s of documents

### Future (Multi-User, Production)
- BullMQ/Redis job queue
- Worker pool for extraction
- Horizontal scaling (multiple app containers)
- S3 for file storage
- Hosted PostgreSQL (RDS/Supabase)

---

## 8. Security Considerations

### Current Scope
- Local deployment (no auth needed)
- File type validation
- Size limits on uploads
- No public network exposure

### Future Additions
- User authentication (NextAuth.js)
- Row-level security in PostgreSQL
- API rate limiting
- File scanning (virus detection)
- Audit logs

---

## 9. Error Handling Strategy

### Extraction Failures
- Log error + document ID
- Store partial evidence if any
- Flag document for manual review
- Continue processing other documents

### LLM API Failures
- Retry with exponential backoff
- Fall back to lower confidence
- Queue for later retry
- Alert user if critical

### Database Failures
- Transaction rollback
- Preserve file uploads
- Re-runnable extraction
- No data loss on failure

---

## 10. Monitoring & Observability

### Logs
- Structured JSON logs
- Per-service logging
- Error aggregation
- Performance metrics

### Metrics (Future)
- Extraction success rate
- Inference accuracy (user-confirmed)
- API latency
- Database query performance

### Alerts (Future)
- OpenAI API failures
- Database connection issues
- Disk space warnings
- Job queue backlog

---

## 11. Communication Patterns & State Management

### 11.1 Pub/Sub Assessment

**Question**: Should the system use pub/sub for inter-component communication?

**Analysis**:

**Current architecture**:
- Synchronous request-response (API → Service → DB)
- Single application container
- Local deployment (single user)
- Processing pipeline: Upload → Extract → Infer → Assemble
- Scale: 100s of documents (not millions)

**Communication flow**:
```
User → API Route → Service → Database
                      ↓
                 Queue (DB-backed) → Extractor → Database
```

**Recommendation for MVP (Phases 0-7)**: ❌ **NO pub/sub needed**

**Why**:
- **No distributed components**: All services in same process
- **Sequential processing acceptable**: User can wait for results
- **Simple queue sufficient**: Database-backed queue provides persistence
- **No real-time requirements**: Batch processing, not streaming
- **Complexity cost**: Pub/sub adds Redis dependency + message handling overhead

**When to add pub/sub (Phase 9+)**:

✅ **Multi-user deployment**: Multiple users uploading simultaneously
✅ **Distributed workers**: Separate extraction worker containers
✅ **Real-time updates**: WebSocket notifications to UI
✅ **High-volume processing**: 1000s of documents per hour
✅ **Event-driven architecture**: Microservices coordination

**Technology for future**: Redis pub/sub or BullMQ (Redis-backed job queue with events)

**Decision**: Use database-backed persistent queue for MVP, add pub/sub in Phase 9+ if needed.

---

### 11.2 State Management & Source of Truth

**Question**: What is the source of truth? How is state managed?

**Answer**: PostgreSQL database is the **single source of truth**

**State locations**:

| State Type | Storage | Persistence | Purpose |
|-----------|---------|-------------|---------|
| **Documents** | `documents` table | ✅ Persistent | Uploaded file metadata |
| **Evidence** | `evidence` table | ✅ Persistent | Extracted facts |
| **Features** | `features` table | ✅ Persistent | Inferred capabilities |
| **Relationships** | `feature_evidence` table | ✅ Persistent | Graph edges |
| **Processing jobs** | `processing_jobs` table | ✅ Persistent | Queue state |
| **Outputs** | `feature_outputs` table | ✅ Persistent | Generated artifacts |
| **User sessions** | Next.js cookies | ⚠️ Volatile | UI state (acceptable) |
| **React UI state** | Client memory | ⚠️ Volatile | Transient (acceptable) |

**Key principle**: All business state is persistent in PostgreSQL

**Zero data loss guarantees**:
1. **Queue persistence**: Jobs stored in `processing_jobs` table
2. **Transaction safety**: Atomic batch uploads (all-or-nothing)
3. **Cascade deletes**: Referential integrity maintained
4. **On restart**: Resume all pending/processing jobs from database
5. **No in-memory state**: Application is stateless (can restart anytime)

**Why NOT Redis/separate state store for MVP**:
- PostgreSQL sufficient for local, single-user
- ACID transactions provide consistency
- Simpler architecture (one database)
- Queue throughput adequate (not high-frequency)

**When to add Redis (Phase 9+)**:
- Session management for multi-user
- High-frequency status updates
- WebSocket pub/sub for real-time UI
- Caching for performance

**Decision**: PostgreSQL is source of truth for MVP, application is stateless and restartable without data loss.

---

## 12. Migration Path: Monolith → Microservices

### 11.1 Current Architecture (Monolith)

**Decision**: Start with Next.js monolith for faster MVP development

**Structure**:
```
/app
  /api              # Backend (API routes)
  /(pages)          # Frontend (React pages)
  /components       # Frontend components
  /lib
    /services       # Backend business logic
    /ai             # Backend AI integration
    /db             # Backend database
    /utils          # Shared utilities
    /types          # Shared types
```

**Benefits**:
- Single codebase, shared types
- No CORS configuration
- Simpler deployment (one container)
- Faster development iteration

---

### 11.2 Separation Strategy

The monolith is designed with **clear boundaries** for easy extraction:

#### Backend Code (Extractable)
- `/app/api/*` - All API routes
- `/lib/services/*` - Business logic (Extraction, Inference, etc.)
- `/lib/ai/*` - OpenAI integration
- `/lib/db/*` - Database client & schema

#### Frontend Code (Stays in Next.js)
- `/app/(pages)` - All page routes
- `/components/*` - React components
- Frontend-specific utilities

#### Shared Code
- `/lib/types/*` - TypeScript types
- `/lib/utils/*` - Pure utility functions

---

### 11.3 Migration Steps (When Needed)

#### Step 1: Create Separate Backend Repo

```bash
# Create new server repo
mkdir feature-engine-server
cd feature-engine-server
git init

# Copy backend code
cp -r ../app/api ./src/routes
cp -r ../lib/services ./src/services
cp -r ../lib/ai ./src/ai
cp -r ../lib/db ./src/db
```

#### Step 2: Convert API Routes to Express/Fastify

**Before (Next.js API route)**:
```typescript
// app/api/upload/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  // Process upload

  return NextResponse.json({ documentId });
}
```

**After (Express)**:
```typescript
// server/src/routes/upload.ts
import { Router } from 'express';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  // Process upload (same logic)

  res.json({ documentId });
});

export default router;
```

#### Step 3: Extract Shared Types to NPM Package

```bash
# Create types package
mkdir @feature-engine/types
cd @feature-engine/types

# Copy types
cp -r ../lib/types/* ./src/

# Publish to private npm registry or GitHub packages
npm publish
```

**Usage**:
```typescript
// In server
import { Evidence, Feature } from '@feature-engine/types';

// In frontend
import { Evidence, Feature } from '@feature-engine/types';
```

#### Step 4: Update Frontend to Call External API

**Before (Internal API)**:
```typescript
// Direct server-side call
import { uploadFile } from '@/lib/services/upload';

const result = await uploadFile(file);
```

**After (HTTP Client)**:
```typescript
// API client
import { apiClient } from '@/lib/api-client';

const result = await apiClient.post('/upload', formData);
```

#### Step 5: Configure CORS

```typescript
// server/src/app.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

---

### 11.4 Code Organization for Easy Separation

#### Rule 1: No Frontend Code in Backend Services

❌ **Bad**:
```typescript
// lib/services/ExtractionService.ts
import { useRouter } from 'next/navigation';  // Frontend dependency!

export class ExtractionService {
  async extract() {
    // ...
  }
}
```

✅ **Good**:
```typescript
// lib/services/ExtractionService.ts
// Pure Node.js, no Next.js imports

export class ExtractionService {
  async extract() {
    // ...
  }
}
```

#### Rule 2: All Backend Code is Framework-Agnostic

Backend services should not depend on Next.js:

✅ **Good**:
```typescript
// lib/services/ExtractionService.ts
import { Database } from '@/lib/db/client';  // Generic DB client

export class ExtractionService {
  constructor(private db: Database) {}

  async extract(documentId: string): Promise<Evidence[]> {
    // Framework-agnostic logic
  }
}
```

#### Rule 3: API Routes are Thin Wrappers

API routes should only handle HTTP, not business logic:

✅ **Good**:
```typescript
// app/api/extract/route.ts
import { NextResponse } from 'next/server';
import { extractionService } from '@/lib/services/ExtractionService';

export async function POST(request: Request) {
  const { documentId } = await request.json();

  // Thin wrapper - just HTTP handling
  try {
    const evidence = await extractionService.extract(documentId);
    return NextResponse.json({ evidence });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

❌ **Bad**:
```typescript
// app/api/extract/route.ts
export async function POST(request: Request) {
  // Business logic directly in route - hard to extract!
  const formData = await request.formData();
  const file = formData.get('file');
  const buffer = await file.arrayBuffer();
  const pdf = await parsePdf(buffer);
  // ... 100 lines of extraction logic
}
```

#### Rule 4: Database Client is Abstracted

Use an interface so you can swap implementations:

```typescript
// lib/db/types.ts
export interface Database {
  query<T>(sql: string, params: any[]): Promise<T[]>;
  insert<T>(table: string, data: any): Promise<T>;
}

// lib/db/client.ts (PostgreSQL implementation)
export const db: Database = createDrizzleClient();

// Easy to swap: MongoDB, in-memory, etc.
```

---

### 11.5 When to Separate?

**Stay Monolith If**:
- Team size < 5 people
- MVP/prototype phase
- Single deployment is sufficient
- Shared types provide value

**Consider Separation When**:
- Need independent scaling (heavy backend load)
- Multiple teams (frontend team + backend team)
- Want to rewrite frontend (React → Vue)
- Backend used by multiple clients (web + mobile)
- Performance bottlenecks require optimization

---

### 11.6 Post-Separation Architecture

```
┌─────────────────┐         HTTP/REST        ┌─────────────────┐
│                 │◄────────────────────────►│                 │
│  Next.js App    │                          │  Express API    │
│  (Frontend)     │                          │  (Backend)      │
│                 │                          │                 │
│  - Pages        │                          │  - Routes       │
│  - Components   │                          │  - Services     │
│  - Client State │                          │  - DB Access    │
└─────────────────┘                          └────────┬────────┘
                                                      │
                                                      │
                                             ┌────────▼────────┐
                                             │                 │
                                             │   PostgreSQL    │
                                             │   + Chroma      │
                                             │                 │
                                             └─────────────────┘
```

**Two Docker containers**:
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - chroma
```

---

### 11.7 Documentation for Separation

When ready to separate, follow these docs:

1. **Backend Migration Guide** (to be created when needed)
   - Express/Fastify setup
   - Route conversion patterns
   - Middleware configuration
   - Error handling standardization

2. **API Client Generation** (to be created when needed)
   - OpenAPI spec generation from types
   - TypeScript SDK generation
   - Frontend integration

3. **Deployment Guide** (to be created when needed)
   - Separate Docker images
   - Docker Compose multi-service
   - Environment variables split
   - Database migration strategy

---

### 11.8 Current Status

**Status**: Monolith (MVP)

**Code Organization**: Ready for separation (follows all rules above)

**Next Steps**: Build MVP, evaluate need for separation after Phase 7

**Estimated Separation Effort**: 1-2 weeks when needed (already architected for it)
