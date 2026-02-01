# Technology Stack
## AI Feature Inference Engine

---

## 1. Core Technologies

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| **Frontend** | Next.js | 15.x | Full-stack React framework, App Router, TypeScript support |
| **Backend** | Node.js | 20.x LTS | Runtime for Next.js, async I/O for AI APIs |
| **Language** | TypeScript | 5.x | Type safety, better DX, catches errors at compile time |
| **Database** | PostgreSQL | 16.x | Relational model, ACID compliance, mature ecosystem |
| **Vector Search** | pgvector | 0.5.x | Native PostgreSQL extension, no separate service |
| **Vector DB** | Chroma | 0.4.x | Local embedding storage, simple API |
| **ORM** | Drizzle ORM | Latest | Type-safe, PostgreSQL-native, great migrations |
| **Container** | Docker Compose | 2.x | Local deployment, reproducible environment |

---

## 2. AI Services (External APIs)

### 2.1 OpenAI APIs

| Service | Model | Usage | Cost Considerations |
|---------|-------|-------|---------------------|
| **Vision** | GPT-4 Vision | Screenshot analysis, UI extraction | $0.01/image |
| **LLM** | GPT-4o | Feature inference, correlation | $5/1M input tokens |
| **Embeddings** | text-embedding-3-large | Evidence vectorization | $0.13/1M tokens |

**API Client**: Official `openai` npm package

**Rate Limits**:
- Vision: 50 requests/min
- LLM: 10,000 requests/min
- Embeddings: 5,000 requests/min

**Error Handling**:
- Exponential backoff on 429
- Retry logic for transient errors
- Queue mechanism for batch processing

---

## 3. Frontend Stack

### 3.1 UI Framework

```json
{
  "framework": "Next.js 15 (App Router)",
  "rendering": "Server Components + Client Components",
  "styling": "TailwindCSS",
  "components": "shadcn/ui (recommended)",
  "icons": "lucide-react",
  "forms": "react-hook-form + zod",
  "tables": "@tanstack/react-table",
  "charts": "recharts (for confidence visualization)"
}
```

### 3.2 Key Libraries

- **File Upload**: `react-dropzone`
- **State Management**: React Server Components (reduce client state)
- **HTTP Client**: Native `fetch` (no axios needed)
- **Date Handling**: `date-fns`
- **Markdown Rendering**: `react-markdown`

---

## 4. Backend Stack

### 4.1 API Layer

```typescript
// Next.js API Routes (App Router)
app/api/
  upload/route.ts          // POST multipart/form-data
  extract/route.ts         // POST trigger extraction
  infer/route.ts           // POST run inference
  features/route.ts        // GET, POST, PATCH, DELETE
  features/[id]/route.ts   // GET, PATCH, DELETE single feature
```

### 4.2 Services Layer

```typescript
lib/services/
  ExtractionService.ts       // Multi-format extraction
  FeatureInferenceService.ts // Clustering + hypothesis
  CorrelationService.ts      // Relationship building
  AssemblyService.ts         // Output generation
  EmbeddingService.ts        // OpenAI embeddings
```

### 4.3 Key Libraries

| Purpose | Library | Version |
|---------|---------|---------|
| File hash | `crypto` (native) | - |
| PDF parsing | `pdf-parse` | ^1.1.1 |
| CSV parsing | `papaparse` | ^5.4.1 |
| YAML parsing | `js-yaml` | ^4.1.0 |
| Markdown parsing | `remark` | ^15.0.0 |
| Clustering | `ml-dbscan` | ^2.0.0 |
| Vector math | `ml-matrix` | ^6.11.0 |

---

## 5. Database Stack

### 5.1 PostgreSQL Setup

```yaml
postgres:
  image: pgvector/pgvector:pg16
  extensions:
    - pgvector
    - uuid-ossp
  settings:
    max_connections: 100
    shared_buffers: 256MB
```

### 5.2 Drizzle ORM

**Why Drizzle**:
- Type-safe queries (no runtime overhead)
- SQL-first approach (readable migrations)
- PostgreSQL-specific features (JSONB, vector)
- Great TypeScript integration

**Schema Definition**:
```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, vector } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  // ... rest of schema
});
```

**Migration Tool**: `drizzle-kit`

---

## 6. Vector Store Stack

### 6.1 Chroma Local

```yaml
chroma:
  image: chromadb/chroma:latest
  api: HTTP REST
  client: chromadb npm package
  storage: Persistent volume
```

**Collection Schema**:
```typescript
{
  name: 'evidence_embeddings',
  metadata: {
    hnsw_space: 'cosine',
    embedding_dimension: 3072
  }
}
```

### 6.2 pgvector (Alternative/Backup)

```sql
CREATE EXTENSION vector;

CREATE TABLE evidence (
  embedding vector(3072)
);

CREATE INDEX ON evidence
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Usage**: Fallback if Chroma issues, or primary if performance is better

---

## 7. Development Tools

### 7.1 Build Tools

- **Package Manager**: `pnpm` (fast, efficient)
- **Bundler**: Next.js built-in (Turbopack)
- **TypeScript Compiler**: `tsc` (for type checking)
- **Linter**: ESLint with Next.js config
- **Formatter**: Prettier

### 7.2 Testing

| Type | Tool | Config |
|------|------|--------|
| Unit | Vitest | `vitest.config.ts` |
| Integration | Vitest + Testcontainers | Docker-based |
| E2E | Playwright | `playwright.config.ts` |
| Type Checking | TypeScript | `tsconfig.json` (strict) |

### 7.3 Development Environment

```json
{
  "node": "20.x LTS",
  "pnpm": "^9.0.0",
  "docker": "^24.0.0",
  "docker-compose": "^2.0.0"
}
```

---

## 8. Docker Configuration

### 8.1 Dockerfile (App)

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

### 8.2 docker-compose.yml

```yaml
version: '3.9'

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U engine"]
      interval: 10s
      timeout: 5s
      retries: 5

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      chroma:
        condition: service_healthy
    volumes:
      - ./docs:/app/docs
    environment:
      DATABASE_URL: postgresql://engine:${DB_PASSWORD}@postgres:5432/feature_engine
      CHROMA_URL: http://chroma:8000
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    restart: unless-stopped

volumes:
  postgres_data:
  chroma_data:
```

---

## 9. Environment Variables

### 9.1 Required

```env
# .env.local (development)
DATABASE_URL=postgresql://engine:password@localhost:5432/feature_engine
CHROMA_URL=http://localhost:8000
OPENAI_API_KEY=sk-...

# Optional
NODE_ENV=development
LOG_LEVEL=debug
MAX_FILE_SIZE_MB=50
```

### 9.2 Production

```env
# .env.production
DATABASE_URL=${DATABASE_URL}
CHROMA_URL=${CHROMA_URL}
OPENAI_API_KEY=${OPENAI_API_KEY}
NODE_ENV=production
LOG_LEVEL=info
```

---

## 10. Not Included (Deliberately)

### 10.1 Excluded Technologies

- **GraphQL**: REST is sufficient, simpler
- **Redis**: In-memory queue is enough for MVP
- **Elasticsearch**: Chroma + pgvector cover search needs
- **Kafka**: No streaming requirements
- **Kubernetes**: Docker Compose sufficient for local
- **Microservices**: Monolith is simpler, faster to build

### 10.2 Why These Choices

- **Simplicity**: Fewer moving parts
- **Local-first**: No cloud dependencies
- **Speed**: Faster development, less ops overhead
- **Cost**: Free/open-source stack

---

## 11. Future Considerations

### 11.1 If Scaling Needed

- **Job Queue**: BullMQ + Redis
- **Worker Pool**: Separate worker containers
- **Database**: Hosted PostgreSQL (Supabase/Neon)
- **File Storage**: S3-compatible (MinIO/AWS S3)
- **Observability**: Prometheus + Grafana

### 11.2 Alternative Models

- **Claude API**: For feature inference (compare with GPT-4)
- **Local LLMs**: Ollama for privacy-sensitive deployments
- **Embedding Models**: Voyage AI, Cohere (alternatives to OpenAI)

---

## 12. Version Pinning Strategy

### 12.1 Package.json

```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "drizzle-orm": "^0.36.0",
    "openai": "^4.0.0",
    "chromadb": "^1.8.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### 12.2 Docker Image Pinning

```yaml
postgres:
  image: pgvector/pgvector:pg16  # Fixed major version

chroma:
  image: chromadb/chroma:0.4.24  # Fixed patch version
```

**Update Strategy**: Monthly dependency updates, test before merging
