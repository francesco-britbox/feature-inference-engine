# Phase 9.6: Enrichment UI
## Review and Apply Enrichment Results

> **Duration**: Week 11.6
> **Dependencies**: Phases 9.1-9.5 complete
> **Size**: Small file - manageable for reading

---

## Page: Enrichment Review

**Route**: `/app/features/[id]/enrich/page.tsx`

**Purpose**: Show all enrichment results, allow user to select which to add to acceptance criteria

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Feature                Video Playback              │
├─────────────────────────────────────────────────────────────┤
│ Enrichment Results (35 items)         [Regenerate] [Add All]│
├─────────────────────────────────────────────────────────────┤
│ 🟦 iOS Guidelines (5)                              ▼        │
│   ☑ Must support Picture-in-Picture mode           Mandatory│
│   ☑ Must handle audio session interruptions        Mandatory│
│   ☐ Should respect Low Power Mode                  Advisory │
│   [Select All] [Add Selected (2)]                           │
├─────────────────────────────────────────────────────────────┤
│ 🟩 Android Guidelines (5)                          ▼        │
│   ☑ Must use ExoPlayer for video playback          Mandatory│
│   ☑ Must support playback speed controls           Mandatory│
│   [Select All] [Add Selected (2)]                           │
├─────────────────────────────────────────────────────────────┤
│ 🟨 App Store Certification (3)                     ▼        │
│   ☑ Must not auto-play with sound                  Mandatory│
│   ☑ Must provide content ratings                   Mandatory│
│   [Select All] [Add Selected (2)]                           │
├─────────────────────────────────────────────────────────────┤
│ 🟧 Accessibility (WCAG) (8)                        ▼        │
│   ☑ Must provide closed captions (1.2.2)           Mandatory│
│   ☑ Must provide audio descriptions (1.2.3)        Mandatory│
│   ☐ Must have keyboard controls (2.1.1)            Advisory │
│   [Select All] [Add Selected (2)]                           │
├─────────────────────────────────────────────────────────────┤
│ 🟥 Security (OWASP) (4)                            ▼        │
│   ☑ Must encrypt video streams                     Critical │
│   ☐ Must implement DRM for premium content         Recommended│
│   [Select All] [Add Selected (1)]                           │
├─────────────────────────────────────────────────────────────┤
│ 🟪 Legal Compliance (3)                            ▼        │
│   ☑ Must verify content rights/licensing           Mandatory│
│   ☑ Must implement age restrictions                Mandatory│
│   [Select All] [Add Selected (2)]                           │
├─────────────────────────────────────────────────────────────┤
│ ⚪ Edge Cases (13) - High:5, Medium:6, Low:2       ▼        │
│   ☑ [HIGH] Network loss during playback                     │
│   ☑ [HIGH] App backgrounded → pause playback                │
│   ☑ [HIGH] Headphones unplugged → pause                     │
│   ☐ [MED] Low battery → reduce quality                      │
│   ☐ [MED] Seek during buffering                             │
│   [Show all 13] [Add High Priority (5)]                     │
├─────────────────────────────────────────────────────────────┤
│                   [Apply Selected (11)] [Cancel]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### Enrichment Source Card

```tsx
interface EnrichmentSourceProps {
  source: EnrichmentSource;
  selected: boolean;
  onToggle: (id: string) => void;
}

function EnrichmentSourceCard({ source, selected, onToggle }: EnrichmentSourceProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(source.id)}
        />

        {/* Content */}
        <div className="flex-1 space-y-2">
          <p className="font-medium">{source.content}</p>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={source.mandatory ? 'destructive' : 'secondary'}>
              {source.mandatory ? 'Mandatory' : 'Advisory'}
            </Badge>

            <span>•</span>

            <a href={source.sourceUrl} target="_blank" className="hover:underline">
              {source.sourceName}
            </a>

            <span>•</span>

            <span>Relevance: {(source.relevanceScore * 100).toFixed(0)}%</span>
          </div>

          {/* Expandable details */}
          {source.metadata && (
            <Collapsible>
              <CollapsibleTrigger className="text-xs text-muted-foreground">
                Show details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-xs bg-muted p-2 rounded">
                <pre>{JSON.stringify(source.metadata, null, 2)}</pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Relevance indicator */}
        <Progress value={source.relevanceScore * 100} className="w-16" />
      </div>
    </Card>
  );
}
```

---

## Page Implementation

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

export default function EnrichmentPage({ params }: { params: { id: string } }) {
  const [enrichment, setEnrichment] = useState<EnrichmentResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEnrichment(params.id);
  }, [params.id]);

  async function fetchEnrichment(featureId: string) {
    const response = await fetch(`/api/features/${featureId}/enrichment`);
    const data = await response.json();
    setEnrichment(data);

    // Auto-select mandatory items
    const mandatoryIds = data.sources
      .filter(s => s.mandatory)
      .map(s => s.id);
    setSelected(new Set(mandatoryIds));
  }

  async function triggerEnrichment() {
    setLoading(true);

    await fetch(`/api/features/${params.id}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: ['ios_hig', 'android_material', 'wcag', 'owasp', 'edge_cases'],
        options: {
          includeAppStore: true,
          targetMarkets: ['US', 'EU'],
          edgeCaseLimit: 15
        }
      })
    });

    // Poll for completion
    await pollUntilComplete(params.id);

    // Refresh enrichment data
    await fetchEnrichment(params.id);

    setLoading(false);
  }

  async function applySelected() {
    await fetch(`/api/features/${params.id}/enrichment/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceIds: Array.from(selected)
      })
    });

    // Redirect to feature page
    router.push(`/features/${params.id}`);
  }

  // Group sources by type
  const grouped = groupByType(enrichment?.sources || []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold mt-2">{feature.name}</h1>
        </div>

        {enrichment?.status === 'pending' && (
          <Button onClick={triggerEnrichment} disabled={loading}>
            {loading ? 'Enriching...' : 'Start Enrichment'}
          </Button>
        )}

        {enrichment?.status === 'completed' && (
          <Button onClick={triggerEnrichment} variant="outline">
            Regenerate
          </Button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <Alert>
          <Loader2 className="animate-spin" />
          <AlertDescription>
            Researching platform guidelines, accessibility, security, and edge cases...
            <br />
            This may take 2-3 minutes.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {enrichment?.status === 'completed' && (
        <>
          {/* Summary */}
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              {enrichment.summary.totalSources} items found
            </p>
            <Badge>{enrichment.summary.mandatoryCount} mandatory</Badge>
            <div className="flex-1" />
            <Button variant="secondary" onClick={() => setSelected(new Set())}>
              Clear All
            </Button>
            <Button onClick={() => selectAll(enrichment.sources)}>
              Select All
            </Button>
            <Button onClick={applySelected} disabled={selected.size === 0}>
              Add Selected ({selected.size})
            </Button>
          </div>

          {/* Sources grouped by type */}
          {Object.entries(grouped).map(([type, sources]) => (
            <Collapsible key={type} defaultOpen={true}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-4 bg-muted rounded-lg hover:bg-muted/80">
                <span className="text-lg font-medium">
                  {TYPE_ICONS[type]} {TYPE_LABELS[type]} ({sources.length})
                </span>
                <ChevronDown className="ml-auto" />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-2 mt-2 ml-4">
                {sources.map(source => (
                  <EnrichmentSourceCard
                    key={source.id}
                    source={source}
                    selected={selected.has(source.id)}
                    onToggle={id => toggleSelection(id)}
                  />
                ))}

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllInType(type, sources)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSelectedInType(type)}
                  >
                    Add Selected
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </>
      )}
    </div>
  );
}

const TYPE_ICONS = {
  ios_hig: '🟦',
  android_material: '🟩',
  apple_store: '🟨',
  google_play: '🟨',
  wcag: '🟧',
  owasp: '🟥',
  gdpr: '🟪',
  edge_case: '⚪'
};

const TYPE_LABELS = {
  ios_hig: 'iOS Guidelines',
  android_material: 'Android Guidelines',
  apple_store: 'Apple App Store',
  google_play: 'Google Play',
  wcag: 'Accessibility (WCAG)',
  owasp: 'Security (OWASP)',
  gdpr: 'Legal Compliance',
  edge_case: 'Edge Cases'
};
```

---

## Progress Indicator During Enrichment

```tsx
function EnrichmentProgress({ featureId }: { featureId: string }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');

  useEffect(() => {
    // Poll enrichment status every 2 seconds
    const interval = setInterval(async () => {
      const response = await fetch(`/api/features/${featureId}/enrichment/status`);
      const data = await response.json();

      setProgress(data.progress);
      setStage(data.stage);

      if (data.status === 'completed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [featureId]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Enriching feature...</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>

        <Progress value={progress} />

        <p className="text-sm text-muted-foreground">
          {stage}  {/* "Fetching iOS guidelines..." */}
        </p>
      </div>
    </Card>
  );
}
```

---

## Enrichment Stages

```typescript
enum EnrichmentStage {
  PLATFORM_GUIDELINES = 'Fetching platform guidelines (iOS, Android)...',
  APP_STORE = 'Fetching App Store certification requirements...',
  LEGAL = 'Analyzing legal compliance (GDPR, CCPA)...',
  ACCESSIBILITY = 'Generating accessibility requirements (WCAG)...',
  SECURITY = 'Generating security requirements (OWASP)...',
  EDGE_CASES = 'Mining edge cases from GitHub and Stack Overflow...',
  CONSOLIDATING = 'Consolidating and prioritizing results...',
  COMPLETE = 'Enrichment complete!'
}

// Update progress in API during enrichment
async function enrichWithProgress(featureId: string) {
  await updateProgress(featureId, { stage: EnrichmentStage.PLATFORM_GUIDELINES, progress: 0 });

  const platform = await fetchPlatformGuidelines(feature);
  await updateProgress(featureId, { stage: EnrichmentStage.APP_STORE, progress: 20 });

  const appStore = await fetchAppStoreRequirements(feature);
  await updateProgress(featureId, { stage: EnrichmentStage.LEGAL, progress: 35 });

  // ... continue for all stages

  await updateProgress(featureId, { stage: EnrichmentStage.COMPLETE, progress: 100 });
}
```

---

## Bulk Actions

```tsx
function BulkActions({ sources, selected, onApply }: BulkActionsProps) {
  const mandatoryCount = sources.filter(s => s.mandatory).length;
  const selectedCount = selected.size;

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <div className="flex-1">
        <p className="font-medium">
          {selectedCount} selected ({mandatoryCount} mandatory)
        </p>
        <p className="text-sm text-muted-foreground">
          Mandatory items are pre-selected
        </p>
      </div>

      <Button
        variant="outline"
        onClick={() => selectOnlyMandatory()}
      >
        Mandatory Only
      </Button>

      <Button
        variant="outline"
        onClick={() => selectHighPriority()}
      >
        High Priority
      </Button>

      <Button
        onClick={onApply}
        disabled={selectedCount === 0}
      >
        Add to Acceptance Criteria ({selectedCount})
      </Button>
    </div>
  );
}
```

---

## After Apply: Updated Feature

**Result**: Selected enrichments added to feature_outputs

```typescript
// Before enrichment
{
  "feature": "Video Playback",
  "acceptance_criteria": [
    "User can play video",
    "User can pause video",
    "User can seek to position"
  ]
}

// After enrichment (11 items added)
{
  "feature": "Video Playback",
  "acceptance_criteria": [
    // Original (from evidence)
    "User can play video",
    "User can pause video",
    "User can seek to position",

    // iOS Guidelines
    "Must support Picture-in-Picture mode (iOS HIG)",
    "Must handle audio session interruptions (iOS HIG)",

    // Android Guidelines
    "Must use ExoPlayer for video playback (Material Design)",
    "Must support playback speed controls (Material Design)",

    // Accessibility
    "Must provide closed captions (WCAG 1.2.2)",
    "Must provide audio descriptions (WCAG 1.2.3)",

    // Security
    "Must encrypt video streams (OWASP A02:2021)",

    // Legal
    "Must verify content rights/licensing (Copyright)",
    "Must implement age restrictions (Content Rating)",

    // Edge Cases (High Priority)
    "Must handle network loss: buffer and resume (GitHub #1234)",
    "Must pause when app backgrounded (SO Question 789)",
    "Must pause when headphones unplugged (iOS HIG)"
  ]
}
```

**User exports this to Jira** → Now has 15+ acceptance criteria instead of 3

---

## Re-export Tickets

**After applying enrichments**:

```tsx
<Alert>
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>11 items added to acceptance criteria</AlertTitle>
  <AlertDescription>
    Feature has been updated. Re-export tickets to include new requirements.
    <Button variant="link" onClick={() => router.push(`/features/${featureId}/export`)}>
      Export Tickets
    </Button>
  </AlertDescription>
</Alert>
```

---

## API Endpoint: Apply Enrichment

```typescript
// app/api/features/[id]/enrichment/apply/route.ts

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { sourceIds } = await request.json();

  // 1. Fetch selected sources
  const sources = await db
    .select()
    .from(enrichmentSources)
    .where(inArray(enrichmentSources.id, sourceIds));

  // 2. Get current acceptance criteria
  const feature = await db.select().from(features).where(eq(features.id, params.id));
  const currentCriteria = await db
    .select()
    .from(featureOutputs)
    .where(
      and(
        eq(featureOutputs.featureId, params.id),
        eq(featureOutputs.outputType, 'acceptance_criteria')
      )
    );

  // 3. Append selected enrichments to acceptance criteria
  const updated = [
    ...currentCriteria[0].content.criteria,
    ...sources.map(s => ({
      criterion: s.content,
      source: s.sourceName,
      mandatory: s.mandatory
    }))
  ];

  // 4. Update feature_outputs
  await db
    .update(featureOutputs)
    .set({
      content: { criteria: updated },
      version: currentCriteria[0].version + 1,
      generatedAt: new Date()
    })
    .where(eq(featureOutputs.id, currentCriteria[0].id));

  return NextResponse.json({
    success: true,
    addedCount: sourceIds.length,
    totalCriteria: updated.length
  });
}
```

---

## Testing

```typescript
describe('Enrichment UI', () => {
  it('should show all enrichment sources grouped', () => {
    render(<EnrichmentPage params={{ id: 'feature-123' }} />);

    expect(screen.getByText('iOS Guidelines (5)')).toBeInTheDocument();
    expect(screen.getByText('Edge Cases (13)')).toBeInTheDocument();
  });

  it('should pre-select mandatory items', () => {
    render(<EnrichmentPage params={{ id: 'feature-123' }} />);

    const mandatory = screen.getAllByText('Mandatory');
    mandatory.forEach(item => {
      const checkbox = within(item.closest('div')).getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });
  });

  it('should apply selected enrichments', async () => {
    render(<EnrichmentPage params={{ id: 'feature-123' }} />);

    // Select items
    const checkboxes = screen.getAllByRole('checkbox');
    userEvent.click(checkboxes[0]);
    userEvent.click(checkboxes[1]);

    // Apply
    const applyButton = screen.getByText(/Add to Acceptance Criteria/);
    userEvent.click(applyButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/features/feature-123/enrichment/apply',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
```

---

## File Size

**This file**: ~450 lines
**Status**: ✅ Manageable

**Phase 9 complete** - All 6 sub-files created (each <600 lines)
