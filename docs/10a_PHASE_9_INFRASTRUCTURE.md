# Phase 9.1: Enrichment Infrastructure
## Database, API, Orchestrator Setup

> **Duration**: Week 11.1
> **Dependencies**: Phase 7 complete
> **Size**: Small file - manageable for reading

---

## Database Schema Updates

### Add to features table

```sql
ALTER TABLE features ADD COLUMN enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE features ADD COLUMN enriched_at TIMESTAMPTZ;
ALTER TABLE features ADD COLUMN enrichment_error TEXT;

CREATE INDEX idx_features_enrichment_status ON features(enrichment_status);

ALTER TABLE features ADD CONSTRAINT check_enrichment_status
  CHECK (enrichment_status IN ('pending', 'enriching', 'completed', 'failed', 'skipped'));
```

**Status lifecycle**:
- `pending` → not enriched yet (default)
- `enriching` → currently fetching guidelines
- `completed` → enrichment successful
- `failed` → enrichment failed (see error)
- `skipped` → user chose to skip enrichment

---

### New table: enrichment_sources

```sql
CREATE TABLE enrichment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  content TEXT NOT NULL,
  relevance_score NUMERIC(3,2) CHECK (relevance_score BETWEEN 0 AND 1),
  mandatory BOOLEAN DEFAULT false,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrichment_sources_feature ON enrichment_sources(feature_id);
CREATE INDEX idx_enrichment_sources_type ON enrichment_sources(source_type);
CREATE INDEX idx_enrichment_sources_relevance ON enrichment_sources(relevance_score DESC);

ALTER TABLE enrichment_sources ADD CONSTRAINT check_source_type
  CHECK (source_type IN (
    'ios_hig',
    'android_material',
    'apple_store',
    'google_play',
    'wcag',
    'owasp',
    'gdpr',
    'ccpa',
    'edge_case',
    'other'
  ));
```

**Fields**:
- `source_type`: Category of guideline
- `source_name`: Display name ("iOS Human Interface Guidelines")
- `source_url`: Original source URL (for citation)
- `content`: The actual guideline/requirement text
- `relevance_score`: 0-1 score of how relevant to feature
- `mandatory`: Whether requirement is mandatory (e.g., legal) vs advisory

---

### Migration

```sql
-- drizzle/migrations/000X_add_enrichment.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE features ADD COLUMN enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE features ADD COLUMN enriched_at TIMESTAMPTZ;
ALTER TABLE features ADD COLUMN enrichment_error TEXT;

CREATE INDEX idx_features_enrichment_status ON features(enrichment_status);

CREATE TABLE enrichment_sources (
  -- ... full schema above
);

-- Indexes
```

**Apply**:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

---

## API Endpoints

### POST /api/features/:id/enrich

**Purpose**: Trigger enrichment for a feature

**Request**:
```typescript
POST /api/features/abc-123/enrich
Content-Type: application/json

{
  "sources": ["ios_hig", "android_material", "wcag", "owasp", "edge_cases"],
  "options": {
    "includeAppStore": true,
    "targetMarkets": ["US", "EU"],
    "edgeCaseLimit": 15
  }
}
```

**Response**:
```typescript
{
  "jobId": "job-xyz",
  "status": "enriching",
  "estimatedTime": "2-3 minutes"
}
```

---

### GET /api/features/:id/enrichment

**Purpose**: Get enrichment status and results

**Response**:
```typescript
{
  "status": "completed",
  "enrichedAt": "2024-01-15T10:30:00Z",
  "sources": [
    {
      "id": "source-1",
      "type": "ios_hig",
      "name": "iOS Human Interface Guidelines - Video",
      "url": "https://developer.apple.com/design/...",
      "content": "Video player must support Picture-in-Picture",
      "relevanceScore": 0.92,
      "mandatory": false
    },
    {
      "id": "source-2",
      "type": "gdpr",
      "name": "GDPR - Data Collection",
      "content": "Must obtain explicit consent before collecting user data",
      "relevanceScore": 1.0,
      "mandatory": true
    }
  ],
  "summary": {
    "totalSources": 35,
    "byType": {
      "ios_hig": 5,
      "android_material": 5,
      "wcag": 8,
      "owasp": 4,
      "edge_cases": 13
    },
    "mandatoryCount": 7
  }
}
```

---

### POST /api/features/:id/enrichment/apply

**Purpose**: Add selected enrichment sources to acceptance criteria

**Request**:
```typescript
{
  "sourceIds": ["source-1", "source-2", "source-5"]
}
```

**Response**:
```typescript
{
  "success": true,
  "addedCount": 3,
  "updatedFeature": { /* ... */ }
}
```

---

## Enrichment Orchestrator

### Service Structure

```typescript
// lib/services/enrichment/EnrichmentOrchestrator.ts

export class EnrichmentOrchestrator {
  constructor(
    private platformService: PlatformGuidelineService,
    private legalService: LegalComplianceService,
    private accessibilityService: AccessibilityService,
    private securityService: SecurityService,
    private edgeCaseService: EdgeCaseService
  ) {}

  async enrichFeature(
    featureId: string,
    options: EnrichmentOptions
  ): Promise<EnrichmentResult> {
    const feature = await this.db.getFeature(featureId);

    // Update status
    await this.db.updateFeature(featureId, {
      enrichmentStatus: 'enriching'
    });

    try {
      // Run all enrichments in parallel
      const results = await Promise.allSettled([
        this.enrichPlatform(feature, options),
        this.enrichLegal(feature, options),
        this.enrichAccessibility(feature),
        this.enrichSecurity(feature),
        this.enrichEdgeCases(feature, options)
      ]);

      // Collect successful results
      const sources = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // Store sources
      await this.storeEnrichmentSources(featureId, sources);

      // Update status
      await this.db.updateFeature(featureId, {
        enrichmentStatus: 'completed',
        enrichedAt: new Date()
      });

      return {
        success: true,
        sourcesCount: sources.length,
        sources
      };
    } catch (error) {
      await this.db.updateFeature(featureId, {
        enrichmentStatus: 'failed',
        enrichmentError: error.message
      });

      throw error;
    }
  }

  private async enrichPlatform(
    feature: Feature,
    options: EnrichmentOptions
  ): Promise<EnrichmentSource[]> {
    const sources: EnrichmentSource[] = [];

    // iOS guidelines
    if (options.sources.includes('ios_hig')) {
      const ios = await this.platformService.fetchIOSGuidelines(feature);
      sources.push(...ios);
    }

    // Android guidelines
    if (options.sources.includes('android_material')) {
      const android = await this.platformService.fetchAndroidGuidelines(feature);
      sources.push(...android);
    }

    // App Store certification
    if (options.includeAppStore) {
      const appStore = await this.platformService.fetchAppStoreRequirements(feature);
      sources.push(...appStore);
    }

    return sources;
  }

  // ... other enrichment methods
}
```

---

## Caching Strategy

### Why Cache?

- Guidelines change quarterly (not daily)
- Avoid repeated fetches (save API calls + time)
- Reduce load on external sites

### Implementation

```typescript
// lib/services/enrichment/CacheService.ts

interface CachedGuideline {
  content: string;
  fetchedAt: Date;
  expiresAt: Date;
}

export class CacheService {
  private cache = new Map<string, CachedGuideline>();
  private readonly TTL = 90 * 24 * 60 * 60 * 1000;  // 90 days

  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (new Date() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.content;
  }

  async set(key: string, content: string): Promise<void> {
    this.cache.set(key, {
      content,
      fetchedAt: new Date(),
      expiresAt: new Date(Date.now() + this.TTL)
    });

    // Also persist to database for app restarts
    await this.db.insert('guideline_cache', {
      cache_key: key,
      content,
      expires_at: new Date(Date.now() + this.TTL)
    });
  }
}
```

### Cache table

```sql
CREATE TABLE guideline_cache (
  cache_key TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_guideline_cache_expires ON guideline_cache(expires_at);

-- Cleanup expired cache (cron job)
DELETE FROM guideline_cache WHERE expires_at < NOW();
```

---

## Configuration

**Add to .env.example**:

```env
# Phase 9: External Enrichment
ENABLE_ENRICHMENT=false  # Enable after Phase 7
GITHUB_TOKEN=ghp_...  # Optional: Higher GitHub API rate limits
STACKOVERFLOW_API_KEY=...  # Optional: Stack Exchange API
ENRICHMENT_CACHE_TTL_DAYS=90
TARGET_MARKETS=US,EU,UK  # For legal compliance
ENRICHMENT_TIMEOUT_MS=180000  # 3 minutes per feature
```

---

## Error Handling

### Enrichment Failures

**Graceful degradation**:
- If iOS fetch fails → Continue with Android + Web
- If all platform guidelines fail → Continue with accessibility + security
- If entire enrichment fails → Feature still usable, enrichment_status='failed'

**No blocking**: Enrichment failures don't prevent ticket generation

```typescript
try {
  await enrichFeature(featureId);
} catch (error) {
  // Log error
  console.error('Enrichment failed', { featureId, error });

  // Store error
  await db.updateFeature(featureId, {
    enrichmentStatus: 'failed',
    enrichmentError: error.message
  });

  // User can still export feature (without enrichments)
}
```

---

## Testing

### Test with "Video Playback" feature

```typescript
describe('EnrichmentOrchestrator', () => {
  it('should enrich video playback feature', async () => {
    const feature = await createTestFeature('Video Playback');

    const result = await orchestrator.enrichFeature(feature.id, {
      sources: ['ios_hig', 'android_material', 'wcag', 'edge_cases'],
      includeAppStore: true,
      targetMarkets: ['US', 'EU']
    });

    expect(result.sourcesCount).toBeGreaterThan(20);
    expect(result.sources).toContainEqual(
      expect.objectContaining({
        type: 'ios_hig',
        content: expect.stringContaining('Picture-in-Picture')
      })
    );
  });
});
```

---

## Next Files

**Continue to**:
- [10b_PHASE_9_PLATFORM_GUIDELINES.md](10b_PHASE_9_PLATFORM_GUIDELINES.md) - Fetching iOS, Android guidelines
- [10c_PHASE_9_LEGAL_COMPLIANCE.md](10c_PHASE_9_LEGAL_COMPLIANCE.md) - GDPR, App Store certification
- [10d_PHASE_9_ACCESSIBILITY_SECURITY.md](10d_PHASE_9_ACCESSIBILITY_SECURITY.md) - WCAG, OWASP
- [10e_PHASE_9_EDGE_CASES.md](10e_PHASE_9_EDGE_CASES.md) - Edge case mining
- [10f_PHASE_9_UI.md](10f_PHASE_9_UI.md) - Enrichment UI

**All files <600 lines each**
