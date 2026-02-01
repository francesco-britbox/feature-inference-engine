# Phase 9.5: Edge Case Generation
## Mining GitHub, Stack Overflow, LLM Knowledge

> **Duration**: Week 11.5
> **Dependencies**: Phase 9.1 complete
> **Size**: Medium file - manageable for reading

---

## 1. Edge Case Sources

### 1.1 Three-Pronged Approach

1. **GitHub Issues**: Real bugs from production apps
2. **Stack Overflow**: Common problems developers face
3. **LLM Knowledge Base**: Known edge cases from training data

**Rationale**: Combine real-world issues + theoretical knowledge

---

## 2. GitHub Issues Mining

### 2.1 GitHub Search API

**Source**: https://api.github.com/search/issues

**Strategy**: Search open-source OTT projects for bugs related to feature

```typescript
async function searchGitHubIssues(feature: Feature): Promise<Issue[]> {
  // 1. Build search query
  const query = buildGitHubQuery(feature);

  // 2. Search via API
  const response = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=30&sort=reactions`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`  // Optional
      }
    }
  );

  const data = await response.json();

  return data.items;
}

function buildGitHubQuery(feature: Feature): string {
  // Extract key terms from feature
  const terms = extractKeyTerms(feature);

  // Build query
  const parts = [
    ...terms,                          // Feature keywords
    'label:bug',                      // Only bugs
    'language:typescript OR language:javascript',  // OTT apps typically use JS/TS
    'is:issue',                       // Not PRs
    'comments:>2'                     // Has discussion (more context)
  ];

  return parts.join(' ');
}

function extractKeyTerms(feature: Feature): string[] {
  // Feature name words
  const nameWords = feature.name.toLowerCase().split(/\s+/);

  // Key terms from evidence
  const evidenceKeywords = feature.evidence
    .map(e => e.content.toLowerCase())
    .join(' ')
    .match(/\b(video|audio|playback|stream|login|auth|payment|subscription|buffer|error)\b/g) || [];

  return [...new Set([...nameWords, ...evidenceKeywords])];
}
```

---

### 2.2 Extract Edge Cases from Issues

```typescript
interface GitHubIssue {
  title: string;
  body: string;
  labels: string[];
  comments: number;
  url: string;
}

function extractEdgeCasesFromIssues(issues: GitHubIssue[]): EdgeCaseCandidate[] {
  return issues.map(issue => ({
    scenario: issue.title,
    description: extractFirstParagraph(issue.body),
    source: 'GitHub',
    sourceUrl: issue.url,
    frequency: issue.comments  // More comments = more common issue
  }));
}

function extractFirstParagraph(body: string): string {
  if (!body) return '';

  // Extract first paragraph (before code blocks or lists)
  const paragraphs = body
    .split('\n\n')
    .filter(p => !p.startsWith('```') && !p.startsWith('- ') && !p.startsWith('*'));

  return paragraphs[0]?.slice(0, 300) || '';  // First 300 chars
}
```

---

## 3. Stack Overflow Mining

### 3.1 Stack Exchange API

**Source**: https://api.stackexchange.com/2.3/search

**Strategy**: Search for questions related to feature

```typescript
async function searchStackOverflow(feature: Feature): Promise<Question[]> {
  const terms = extractKeyTerms(feature);

  // Build search query
  const query = [
    ...terms,
    '[android] OR [ios] OR [javascript]',  // OTT platforms
    'is:question',
    'hasaccepted:yes'  // Has accepted answer (validated solution)
  ].join(' ');

  const response = await fetch(
    `https://api.stackexchange.com/2.3/search?` +
    `order=desc&sort=votes&` +
    `intitle=${encodeURIComponent(terms.join(' '))}&` +
    `tagged=android;ios;video;audio&` +
    `site=stackoverflow&` +
    `pagesize=20&` +
    `key=${process.env.STACKOVERFLOW_API_KEY}`
  );

  const data = await response.json();

  return data.items;
}

function extractEdgeCasesFromSO(questions: Question[]): EdgeCaseCandidate[] {
  return questions.map(q => ({
    scenario: q.title,
    description: stripHtmlTags(q.body_markdown).slice(0, 300),
    solution: q.accepted_answer ? stripHtmlTags(q.accepted_answer.body_markdown).slice(0, 300) : null,
    source: 'Stack Overflow',
    sourceUrl: q.link,
    frequency: q.score + q.answer_count  // Higher score = more common
  }));
}
```

---

## 4. LLM Knowledge Base

### 4.1 Generate Known Edge Cases

```typescript
async function generateKnownEdgeCases(feature: Feature): Promise<EdgeCase[]> {
  const prompt = `
You are an expert in OTT platform development with 10+ years experience.

Generate 10-15 critical edge cases for: "${feature.name}"

Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map(e => e.content).join('\n')}

Focus on:
1. Network issues (offline, slow connection, intermittent, proxy)
2. Device issues (low memory, background mode, interruptions, battery)
3. User errors (invalid input, rapid clicks, back navigation)
4. Platform issues (OS updates, permission changes, storage full)
5. Content issues (corrupt files, missing assets, wrong format)
6. Concurrency issues (multiple sessions, race conditions)

For each edge case, return:
{
  "edge_cases": [
    {
      "scenario": "User loses network connection during video playback",
      "expected_behavior": "App buffers available content and displays 'Connecting...' overlay. Resumes playback when connection restored.",
      "test_case": "Given user is watching video at 50% progress, When network disconnects, Then video pauses with loading indicator and buffered content remains available, And video resumes from same position when network reconnects",
      "priority": "high",
      "category": "network"
    }
  ]
}

Priority levels:
- high: Crashes app or blocks core functionality
- medium: Degrades experience but workaround exists
- low: Edge case unlikely to occur

Return 10-15 edge cases, prioritize by likelihood and impact.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,  // Slightly higher for creativity
    max_tokens: 4000
  });

  return JSON.parse(response.choices[0].message.content).edge_cases;
}
```

---

## 5. Consolidation & Deduplication

### 5.1 Merge from All Sources

```typescript
async function consolidateEdgeCases(
  githubCases: EdgeCaseCandidate[],
  soCases: EdgeCaseCandidate[],
  llmCases: EdgeCase[],
  feature: Feature
): Promise<EdgeCase[]> {
  // 1. Combine all candidates
  const allCandidates = [
    ...githubCases.map(c => ({ ...c, source: 'GitHub' })),
    ...soCases.map(c => ({ ...c, source: 'Stack Overflow' })),
    ...llmCases.map(c => ({ ...c, source: 'LLM Knowledge' }))
  ];

  // 2. LLM: Deduplicate and consolidate
  const prompt = `
Consolidate these edge cases for: "${feature.name}"

Edge cases from multiple sources:
${JSON.stringify(allCandidates, null, 2)}

Tasks:
1. Remove duplicates (same scenario, different wording)
2. Merge similar cases
3. Keep most critical edge cases (15-20 max)
4. Prioritize: high > medium > low
5. Ensure test cases are clear and testable

Return JSON:
{
  "edge_cases": [
    {
      "scenario": "Network loss during playback",
      "expected_behavior": "...",
      "test_case": "Given..., When..., Then...",
      "priority": "high",
      "category": "network",
      "sources": ["GitHub Issue #123", "SO Question 456"]
    }
  ]
}

Limit to 15-20 most critical edge cases.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 5000
  });

  return JSON.parse(response.choices[0].message.content).edge_cases;
}
```

---

## 6. Prioritization

### 6.1 Priority Calculation

```typescript
interface EdgeCasePriority {
  likelihood: number;  // 0-1: How likely to occur
  impact: number;      // 0-1: How bad if occurs
  priority: 'high' | 'medium' | 'low';
}

function calculatePriority(edgeCase: EdgeCase, frequency: number): EdgeCasePriority {
  // Likelihood based on frequency (GitHub comments, SO votes)
  const likelihood = Math.min(frequency / 50, 1.0);  // Normalize to 0-1

  // Impact based on keywords
  const impactKeywords = {
    high: ['crash', 'freeze', 'data loss', 'security', 'payment failed'],
    medium: ['error', 'failed', 'not working', 'broken'],
    low: ['slow', 'delay', 'inconsistent']
  };

  let impact = 0.3;  // Default low

  if (impactKeywords.high.some(kw => edgeCase.scenario.toLowerCase().includes(kw))) {
    impact = 0.9;
  } else if (impactKeywords.medium.some(kw => edgeCase.scenario.toLowerCase().includes(kw))) {
    impact = 0.6;
  }

  // Combined priority
  const score = likelihood * impact;

  return {
    likelihood,
    impact,
    priority: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low'
  };
}
```

---

## 7. Complete Edge Case Service

```typescript
// lib/services/enrichment/EdgeCaseService.ts

export class EdgeCaseService {
  async generateEdgeCases(
    feature: Feature,
    options: { limit?: number } = {}
  ): Promise<EnrichmentSource[]> {
    const limit = options.limit || 15;

    // 1. Mine from GitHub (parallel)
    const githubPromise = this.mineGitHub(feature);

    // 2. Mine from Stack Overflow (parallel)
    const soPromise = this.mineStackOverflow(feature);

    // 3. Generate from LLM knowledge (parallel)
    const llmPromise = this.generateFromLLM(feature);

    // Wait for all sources
    const [githubCases, soCases, llmCases] = await Promise.allSettled([
      githubPromise,
      soPromise,
      llmPromise
    ]);

    // Extract successful results
    const all = [
      ...(githubCases.status === 'fulfilled' ? githubCases.value : []),
      ...(soCases.status === 'fulfilled' ? soCases.value : []),
      ...(llmCases.status === 'fulfilled' ? llmCases.value : [])
    ];

    // 4. Consolidate and deduplicate
    const consolidated = await this.consolidate(feature, all);

    // 5. Prioritize and limit
    const prioritized = this.prioritizeEdgeCases(consolidated);

    // 6. Convert to enrichment sources
    return prioritized.slice(0, limit).map((ec, index) => ({
      featureId: feature.id,
      sourceType: 'edge_case',
      sourceName: `Edge Case ${index + 1} (${ec.priority})`,
      content: `${ec.scenario}\n\nExpected: ${ec.expected_behavior}\n\nTest: ${ec.test_case}`,
      relevanceScore: ec.priority === 'high' ? 0.9 : ec.priority === 'medium' ? 0.7 : 0.5,
      mandatory: ec.priority === 'high',
      metadata: {
        category: ec.category,
        sources: ec.sources
      }
    }));
  }

  private async mineGitHub(feature: Feature): Promise<EdgeCaseCandidate[]> {
    const issues = await searchGitHubIssues(feature);
    return extractEdgeCasesFromIssues(issues);
  }

  private async mineStackOverflow(feature: Feature): Promise<EdgeCaseCandidate[]> {
    const questions = await searchStackOverflow(feature);
    return extractEdgeCasesFromSO(questions);
  }

  private async generateFromLLM(feature: Feature): Promise<EdgeCase[]> {
    return await generateKnownEdgeCases(feature);
  }

  private prioritizeEdgeCases(cases: EdgeCase[]): EdgeCase[] {
    return cases.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}
```

---

## 8. Example Output

**For "Video Playback" feature**:

```json
[
  {
    "scenario": "Network loss during playback",
    "expected_behavior": "App buffers content, shows 'Connecting...', resumes when online",
    "test_case": "Given user watching video, When network disconnects, Then video pauses with loading indicator, And resumes from same position when reconnected",
    "priority": "high",
    "category": "network",
    "sources": ["GitHub Issue #1234", "SO Question 789"]
  },
  {
    "scenario": "App backgrounded during playback",
    "expected_behavior": "Playback pauses, saves position, resumes when foregrounded",
    "test_case": "Given video playing, When user switches apps, Then playback pauses, And resumes when user returns",
    "priority": "high",
    "category": "platform"
  },
  {
    "scenario": "Headphones unplugged during playback",
    "expected_behavior": "Playback pauses immediately",
    "test_case": "Given video playing with audio, When headphones disconnected, Then playback pauses automatically",
    "priority": "medium",
    "category": "device"
  },
  {
    "scenario": "Low battery mode enabled",
    "expected_behavior": "Reduce video quality to save battery",
    "test_case": "Given video playing at high quality, When battery drops below 20%, Then quality reduces to SD",
    "priority": "medium",
    "category": "device"
  },
  {
    "scenario": "Corrupt video file uploaded",
    "expected_behavior": "Show user-friendly error, suggest re-upload",
    "test_case": "Given user uploads corrupt MP4, When system detects corruption, Then show 'File corrupted, please try again'",
    "priority": "high",
    "category": "content"
  },
  {
    "scenario": "DRM license expired during playback",
    "expected_behavior": "Pause playback, show purchase/renewal prompt",
    "test_case": "Given user watching DRM-protected video, When license expires mid-playback, Then video pauses with 'Subscription expired' message",
    "priority": "high",
    "category": "security"
  },
  {
    "scenario": "Multiple videos queued, skip to last",
    "expected_behavior": "Current video stops cleanly, last video starts",
    "test_case": "Given queue of 5 videos, When user skips to video 5, Then videos 2-4 don't play, video 5 starts immediately",
    "priority": "low",
    "category": "user"
  },
  {
    "scenario": "Seek to position while buffering",
    "expected_behavior": "Wait for buffer, then seek to position",
    "test_case": "Given video buffering at 30%, When user seeks to 50%, Then wait for 50% buffered, then jump to position",
    "priority": "medium",
    "category": "network"
  },
  {
    "scenario": "Device rotated during playback",
    "expected_behavior": "Adjust aspect ratio, maintain playback position",
    "test_case": "Given video playing in portrait, When device rotated to landscape, Then video expands to fullscreen, playback continues",
    "priority": "medium",
    "category": "device"
  },
  {
    "scenario": "Rapid play/pause clicking",
    "expected_behavior": "Debounce actions, last action wins",
    "test_case": "Given video playing, When user rapidly clicks pause/play 10 times, Then only last action executes",
    "priority": "low",
    "category": "user"
  }
]
```

**Result**: 10-15 edge cases covering network, device, user, content, security scenarios

---

## 9. Rate Limiting

### GitHub API Limits

**Without token**: 60 requests/hour
**With token**: 5,000 requests/hour

**Implementation**:
```typescript
import Bottleneck from 'bottleneck';

const githubLimiter = new Bottleneck({
  reservoir: process.env.GITHUB_TOKEN ? 5000 : 60,
  reservoirRefreshAmount: process.env.GITHUB_TOKEN ? 5000 : 60,
  reservoirRefreshInterval: 60 * 60 * 1000,  // 1 hour
  maxConcurrent: 3
});

const rateLimitedGitHub = githubLimiter.wrap(searchGitHubIssues);
```

### Stack Overflow Limits

**With key**: 300 requests/day

```typescript
const soLimiter = new Bottleneck({
  reservoir: 300,
  reservoirRefreshAmount: 300,
  reservoirRefreshInterval: 24 * 60 * 60 * 1000,  // 24 hours
  maxConcurrent: 1
});
```

---

## 10. Testing

```typescript
describe('EdgeCaseService', () => {
  it('should generate edge cases for video playback', async () => {
    const feature = {
      name: 'Video Playback',
      description: 'Users can play video content',
      evidence: [
        { type: 'ui_element', content: 'Video player with controls' }
      ]
    };

    const edgeCases = await service.generateEdgeCases(feature, { limit: 15 });

    expect(edgeCases.length).toBeGreaterThanOrEqual(10);
    expect(edgeCases.length).toBeLessThanOrEqual(15);

    // Should include network edge case
    expect(edgeCases).toContainEqual(
      expect.objectContaining({
        sourceType: 'edge_case',
        content: expect.stringContaining('network')
      })
    );

    // Should include high priority cases
    const highPriority = edgeCases.filter(ec => ec.mandatory);
    expect(highPriority.length).toBeGreaterThan(0);
  });
});
```

---

## 11. Dependencies

**NPM packages**:
```bash
pnpm add bottleneck
# GitHub and Stack Overflow use native fetch
```

**Environment variables**:
```env
GITHUB_TOKEN=ghp_...  # Optional: Higher rate limits (5000/hour)
STACKOVERFLOW_API_KEY=...  # Optional: Stack Exchange API key
```

---

## 12. Error Handling

### Graceful Degradation

```typescript
async function generateEdgeCasesWithFallback(feature: Feature): Promise<EnrichmentSource[]> {
  const sources: EdgeCaseCandidate[] = [];

  // Try GitHub (don't fail if API down)
  try {
    const github = await searchGitHubIssues(feature);
    sources.push(...github);
  } catch (error) {
    console.warn('GitHub mining failed', error);
  }

  // Try Stack Overflow (don't fail if API down)
  try {
    const so = await searchStackOverflow(feature);
    sources.push(...so);
  } catch (error) {
    console.warn('Stack Overflow mining failed', error);
  }

  // Always use LLM (fallback if external sources fail)
  const llmCases = await generateKnownEdgeCases(feature);

  // If all external sources failed, LLM provides full coverage
  if (sources.length === 0) {
    return llmCases;
  }

  // Consolidate all sources
  return await consolidateEdgeCases(sources, llmCases, feature);
}
```

**Result**: Even if GitHub/SO fail, LLM provides 10-15 edge cases

---

## File Size

**This file**: ~500 lines
**Status**: ✅ Manageable

**Next**: [10f_PHASE_9_UI.md](10f_PHASE_9_UI.md)
