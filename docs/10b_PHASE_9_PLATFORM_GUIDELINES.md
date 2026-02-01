# Phase 9.2: Platform Guidelines Fetching
## iOS, Android, App Store Requirements

> **Duration**: Week 11.2
> **Dependencies**: Phase 9.1 complete
> **Size**: Medium file - manageable for reading

---

## 1. iOS Human Interface Guidelines

### 1.1 Source & Method

**Source**: https://developer.apple.com/design/human-interface-guidelines/
**Method**: Web scraping + LLM extraction
**Update frequency**: Quarterly (cache for 90 days)

### 1.2 Feature Category Mapping

```typescript
// Map OTT features to HIG sections
const IOS_HIG_MAP = {
  // Authentication features
  'login': 'sign-in-with-apple',
  'signup': 'sign-in-with-apple',
  'password-reset': 'sign-in-with-apple',

  // Media features
  'video-playback': 'playing-video',
  'audio-playback': 'playing-audio',
  'live-streaming': 'playing-video',

  // Navigation
  'home-screen': 'tab-bars',
  'menu': 'menus',
  'search': 'search-fields',

  // Content
  'content-list': 'tables',
  'content-detail': 'split-views',

  // Subscription
  'subscription': 'in-app-purchase',
  'payment': 'in-app-purchase',

  // Profile
  'user-profile': 'settings',
  'preferences': 'settings',

  // ... add more mappings
};

function categorizeForIOS(feature: Feature): string {
  // Normalize feature name
  const normalized = feature.name.toLowerCase().replace(/\s+/g, '-');

  // Direct mapping
  if (IOS_HIG_MAP[normalized]) {
    return IOS_HIG_MAP[normalized];
  }

  // LLM-based categorization (fallback)
  return await llmCategorize(feature, Object.keys(IOS_HIG_MAP));
}
```

### 1.3 Fetching Implementation

```typescript
async function fetchIOSGuidelines(feature: Feature): Promise<EnrichmentSource[]> {
  // 1. Determine category
  const category = categorizeForIOS(feature);

  // 2. Build URL
  const url = `https://developer.apple.com/design/human-interface-guidelines/${category}`;

  // 3. Check cache
  const cacheKey = `ios_hig_${category}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return parseAndMatchGuidelines(feature, cached);
  }

  // 4. Fetch page with timeout
  const html = await fetchWithTimeout(url, 10000);

  // 5. Parse HTML to text
  const $ = cheerio.load(html);
  const content = $('.content-section')
    .toArray()
    .map(el => $(el).text().trim())
    .join('\n\n');

  // 6. Cache results
  await cache.set(cacheKey, content);

  // 7. Extract relevant guidelines with LLM
  return parseAndMatchGuidelines(feature, content);
}

async function parseAndMatchGuidelines(
  feature: Feature,
  guidelineText: string
): Promise<EnrichmentSource[]> {
  const prompt = `
Extract iOS Human Interface Guidelines relevant to: "${feature.name}"

Feature description: ${feature.description}

Guidelines content:
${guidelineText}

Return JSON array of relevant guidelines:
[
  {
    "content": "Video player must support Picture-in-Picture mode",
    "relevance_score": 0.95,
    "mandatory": true,
    "reasoning": "Core iOS video playback requirement"
  }
]

Only include guidelines with relevance_score ≥ 0.6
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2000
  });

  const guidelines = JSON.parse(response.choices[0].message.content);

  return guidelines.map(g => ({
    featureId: feature.id,
    sourceType: 'ios_hig',
    sourceName: 'iOS Human Interface Guidelines',
    sourceUrl: url,
    content: g.content,
    relevanceScore: g.relevance_score,
    mandatory: g.mandatory
  }));
}
```

---

## 2. Android Material Design Guidelines

### 2.1 Source & Method

**Source**: https://m3.material.io/
**Method**: Same as iOS (web scraping + LLM)

### 2.2 Category Mapping

```typescript
const ANDROID_MATERIAL_MAP = {
  'login': 'components/text-fields',
  'video-playback': 'foundations/motion',
  'navigation': 'components/navigation-bar',
  'search': 'components/search',
  'subscription': 'components/cards',
  // ... add more
};
```

### 2.3 Implementation

```typescript
async function fetchAndroidGuidelines(feature: Feature): Promise<EnrichmentSource[]> {
  const category = categorizeForAndroid(feature);
  const url = `https://m3.material.io/${category}`;

  // Same pattern as iOS:
  // 1. Check cache
  // 2. Fetch HTML
  // 3. Parse content
  // 4. LLM extract relevant guidelines
  // 5. Return sources with relevance scores
}
```

---

## 3. App Store Certification Requirements

### 3.1 Apple App Store Review Guidelines

**Source**: https://developer.apple.com/app-store/review/guidelines/
**Method**: Fetch full document, LLM search for relevant sections

### 3.2 Implementation

```typescript
async function fetchAppStoreRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  // 1. Fetch complete guidelines (cache for 30 days)
  const guidelinesDoc = await fetchAppStoreGuidelines();

  // 2. LLM: Search for relevant sections
  const prompt = `
Review Apple App Store Review Guidelines for requirements related to: "${feature.name}"

Feature type: ${feature.category}
Feature description: ${feature.description}

Guidelines document (excerpt):
${guidelinesDoc}

Return JSON:
[
  {
    "guideline_id": "4.2.3",
    "section": "Performance - Accurate Metadata",
    "requirement": "App must use in-app purchase for unlocking features",
    "relevance_score": 0.9,
    "mandatory": true,
    "rejection_risk": "high"
  }
]

Focus on guidelines that could cause app rejection.
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,  // Very low - want accuracy
    max_tokens: 3000
  });

  const requirements = JSON.parse(response.choices[0].message.content);

  return requirements.map(r => ({
    featureId: feature.id,
    sourceType: 'apple_store',
    sourceName: `Apple App Store Guidelines ${r.guideline_id}`,
    sourceUrl: `https://developer.apple.com/app-store/review/guidelines/#${r.guideline_id}`,
    content: r.requirement,
    relevanceScore: r.relevance_score,
    mandatory: r.mandatory,
    metadata: {
      section: r.section,
      rejectionRisk: r.rejection_risk
    }
  }));
}

async function fetchAppStoreGuidelines(): Promise<string> {
  const cacheKey = 'apple_store_guidelines_full';
  const cached = await cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch full guidelines page
  const html = await fetch('https://developer.apple.com/app-store/review/guidelines/')
    .then(r => r.text());

  // Parse to text
  const $ = cheerio.load(html);
  const text = $('.guidelines-content').text();

  // Cache for 30 days (updated monthly)
  await cache.set(cacheKey, text, 30 * 24 * 60 * 60 * 1000);

  return text;
}
```

---

### 3.3 Google Play Policy Requirements

**Source**: https://support.google.com/googleplay/android-developer/answer/9859455
**Method**: Same as Apple (fetch full document, LLM search)

```typescript
async function fetchGooglePlayRequirements(feature: Feature): Promise<EnrichmentSource[]> {
  const guidelinesDoc = await fetchGooglePlayPolicies();

  const prompt = `
Review Google Play Policy for requirements related to: "${feature.name}"

Feature type: ${feature.category}
Feature evidence: ${feature.evidence.map(e => e.content).join('\n')}

Policy document:
${guidelinesDoc}

Return JSON with relevant requirements:
[
  {
    "policy_id": "Content Policies",
    "requirement": "Apps must not auto-play video with sound",
    "relevance_score": 0.85,
    "mandatory": true
  }
]
  `;

  // LLM extracts relevant sections
  // Same return format as Apple Store
}
```

---

## 4. Web Standards

### 4.1 Sources

- **MDN Web Docs**: https://developer.mozilla.org/
- **W3C Standards**: https://www.w3.org/
- **Web.dev Best Practices**: https://web.dev/

### 4.2 Implementation

```typescript
async function fetchWebStandards(feature: Feature): Promise<EnrichmentSource[]> {
  // Focus on PWA, performance, UX best practices

  const sources: EnrichmentSource[] = [];

  // 1. MDN documentation for feature
  if (feature.evidence.some(e => e.type === 'endpoint')) {
    // API features → Fetch API best practices
    sources.push(...await fetchMDNApi Docs(feature));
  }

  if (feature.evidence.some(e => e.type === 'ui_element')) {
    // UI features → HTML/CSS/JS best practices
    sources.push(...await fetchMDNUIBestPractices(feature));
  }

  // 2. Web.dev performance guidelines
  if (this.isMediaFeature(feature)) {
    sources.push(...await fetchWebDevMediaGuidelines(feature));
  }

  return sources;
}
```

---

## 5. Matching Algorithm

### 5.1 Two-Stage Matching

**Stage 1: Keyword-based pre-filter** (fast, eliminates 80% non-relevant)

```typescript
function prefilterByKeywords(
  feature: Feature,
  guidelines: string[]
): string[] {
  // Extract keywords from feature
  const featureText = [
    feature.name,
    feature.description,
    ...feature.evidence.map(e => e.content)
  ].join(' ');

  const featureKeywords = extractKeywords(featureText);

  // Filter guidelines that have keyword overlap
  return guidelines.filter(guideline => {
    const guidelineKeywords = extractKeywords(guideline);
    const overlap = featureKeywords.filter(k =>
      guidelineKeywords.includes(k)
    );
    return overlap.length >= 2;  // At least 2 matching keywords
  });
}

function extractKeywords(text: string): string[] {
  // Remove stop words, extract nouns/verbs
  const words = text.toLowerCase().split(/\W+/);

  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', ...]);

  return words
    .filter(w => w.length > 3)
    .filter(w => !stopWords.has(w))
    .slice(0, 20);  // Top 20 keywords
}
```

**Stage 2: LLM-based relevance scoring** (accurate, only on pre-filtered)

```typescript
async function scorerelevance(
  feature: Feature,
  prefiltered: string[]
): Promise<MatchResult[]> {
  const prompt = `
Score relevance (0-1) of these guidelines to feature: "${feature.name}"

Feature context:
- Description: ${feature.description}
- Evidence: ${feature.evidence.map(e => e.content).join(', ')}

Guidelines:
${prefiltered.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Return JSON:
{
  "matches": [
    { "index": 1, "score": 0.92, "reasoning": "..." },
    { "index": 3, "score": 0.75, "reasoning": "..." }
  ]
}

Only include scores ≥ 0.6
  `;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  });

  return JSON.parse(response.choices[0].message.content).matches;
}
```

---

## 6. Rate Limiting

### 6.1 External Site Rate Limits

**Apple**: No official API, respectful scraping
- Max 10 requests per minute
- User-Agent required
- robots.txt compliant

**Google**: Similar to Apple
- Max 10 requests per minute

**GitHub API**:
- 60 requests/hour (unauthenticated)
- 5,000 requests/hour (with token)

**Stack Overflow API**:
- 300 requests/day (with key)

### 6.2 Implementation

```typescript
import Bottleneck from 'bottleneck';

// Web scraping rate limiter
const webLimiter = new Bottleneck({
  minTime: 6000,  // 10 requests per minute = 1 per 6 seconds
  maxConcurrent: 1
});

// GitHub API rate limiter
const githubLimiter = new Bottleneck({
  reservoir: 5000,  // Max requests (with token)
  reservoirRefreshAmount: 5000,
  reservoirRefreshInterval: 60 * 60 * 1000,  // 1 hour
  maxConcurrent: 5
});

// Wrap fetch calls
const rateLimitedFetch = webLimiter.wrap(fetch);
const rateLimitedGitHub = githubLimiter.wrap(fetchGitHub);
```

---

## 7. HTML Parsing

### 7.1 Using Cheerio

```typescript
import * as cheerio from 'cheerio';

function parseIOSGuidelinePage(html: string): string {
  const $ = cheerio.load(html);

  // iOS HIG has specific structure
  const sections = [];

  // Extract main content sections
  $('.content-section').each((i, el) => {
    const heading = $(el).find('h2, h3').first().text();
    const content = $(el).find('p, li').toArray()
      .map(p => $(p).text().trim())
      .filter(text => text.length > 0)
      .join('\n');

    if (content.length > 50) {  // Skip empty sections
      sections.push({ heading, content });
    }
  });

  // Combine into readable text
  return sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n');
}
```

---

## 8. Fallback Strategy

### 8.1 If Direct URL Fails

```typescript
async function fetchIOSGuidelinesWithFallback(feature: Feature): Promise<EnrichmentSource[]> {
  const category = categorizeForIOS(feature);
  const url = buildIOSUrl(category);

  try {
    // Try direct URL
    const html = await rateLimitedFetch(url);

    if (html.status === 200) {
      return parseAndExtract(html);
    }
  } catch (error) {
    console.warn('Direct fetch failed, trying search', { category, error });
  }

  // Fallback: Search HIG site
  return await searchIOSGuidelines(feature.name);
}

async function searchIOSGuidelines(featureName: string): Promise<EnrichmentSource[]> {
  // 1. Search Apple developer site
  const searchUrl = `https://developer.apple.com/search/?q=${encodeURIComponent(featureName)}`;

  const html = await rateLimitedFetch(searchUrl);

  // 2. Parse search results (top 3)
  const $ = cheerio.load(html);
  const results = $('.search-result')
    .toArray()
    .slice(0, 3)
    .map(el => ({
      title: $(el).find('.title').text(),
      url: $(el).find('a').attr('href'),
      snippet: $(el).find('.snippet').text()
    }));

  // 3. Fetch each result page
  const contents = await Promise.all(
    results.map(r => rateLimitedFetch(r.url).then(parseContent))
  );

  // 4. LLM: Consolidate relevant guidelines from all pages
  return consolidateGuidelines(feature, contents);
}
```

---

## 9. Testing

### Test with Real Features

```typescript
describe('PlatformGuidelineService - iOS', () => {
  it('should fetch guidelines for Video Playback', async () => {
    const feature = {
      name: 'Video Playback',
      description: 'Users can play video content',
      evidence: [
        { type: 'ui_element', content: 'Play button' },
        { type: 'ui_element', content: 'Progress slider' }
      ]
    };

    const guidelines = await service.fetchIOSGuidelines(feature);

    expect(guidelines.length).toBeGreaterThan(3);
    expect(guidelines).toContainEqual(
      expect.objectContaining({
        sourceType: 'ios_hig',
        content: expect.stringContaining('Picture-in-Picture')
      })
    );
  });

  it('should handle 404 with fallback search', async () => {
    const feature = { name: 'Unknown Feature' };

    const guidelines = await service.fetchIOSGuidelines(feature);

    // Should still return something via search fallback
    expect(guidelines).toBeDefined();
  });
});
```

---

## 10. Dependencies

**NPM packages**:
```bash
pnpm add cheerio bottleneck
pnpm add @types/cheerio -D
```

**APIs**:
- OpenAI (already configured)
- GitHub (optional token for higher limits)
- Stack Exchange (optional key)

---

## 11. Error Handling

### Graceful Degradation

```typescript
async function enrichWithPlatformGuidelines(feature: Feature): Promise<EnrichmentSource[]> {
  const results: EnrichmentSource[] = [];

  // Try iOS
  try {
    const ios = await fetchIOSGuidelines(feature);
    results.push(...ios);
  } catch (error) {
    console.error('iOS fetch failed', error);
    // Continue with Android
  }

  // Try Android
  try {
    const android = await fetchAndroidGuidelines(feature);
    results.push(...android);
  } catch (error) {
    console.error('Android fetch failed', error);
    // Continue with Web
  }

  // Try Web standards
  try {
    const web = await fetchWebStandards(feature);
    results.push(...web);
  } catch (error) {
    console.error('Web fetch failed', error);
    // At least we tried
  }

  // If all failed, return empty (but don't throw)
  return results;
}
```

**Result**: Partial enrichment better than no enrichment

---

## File Size

**This file**: ~550 lines
**Status**: ✅ Manageable

**Next file**: [10c_PHASE_9_LEGAL_COMPLIANCE.md](10c_PHASE_9_LEGAL_COMPLIANCE.md)
