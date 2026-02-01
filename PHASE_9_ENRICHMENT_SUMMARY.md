# Phase 9: External Enrichment Summary ✅
## Complete Specification for Platform Guidelines, Compliance, Edge Cases

**Status**: ✅ **COMPLETE AND DETAILED**
**Type**: Optional enhancement (run after Phase 7)
**Documentation**: Split into 7 manageable files

---

## What Phase 9 Adds

**For each feature (e.g., "Video Playback"), automatically research and generate**:

1. ✅ **iOS Guidelines** - Apple Human Interface Guidelines
2. ✅ **Android Guidelines** - Material Design 3 specifications
3. ✅ **Apple App Store** - Certification requirements (app review guidelines)
4. ✅ **Google Play** - Policy requirements (Play Store guidelines)
5. ✅ **WCAG Accessibility** - 2.1 AA compliance requirements
6. ✅ **OWASP Security** - Top 10 security best practices
7. ✅ **GDPR** - European data protection requirements
8. ✅ **CCPA** - California privacy requirements
9. ✅ **Copyright** - Content licensing and DRM requirements
10. ✅ **Age Restrictions** - COPPA, content rating, parental controls
11. ✅ **Edge Cases** - 10-15 scenarios mined from GitHub + Stack Overflow + LLM

**Result**: "Video Playback" feature goes from 3 criteria → 30-40 criteria

---

## Implementation Details (ALL SPECIFIED)

### How to Fetch

**iOS/Android**:
- Web scraping with `cheerio`
- Rate limited (10 requests/min)
- Cached (90 days)
- Fallback to search if direct URL fails

**App Store/Play Store**:
- Fetch complete guidelines document
- Cache entire document (30 days)
- LLM searches document for relevant sections

**Legal (GDPR, CCPA)**:
- Static requirement lists (updated quarterly)
- LLM filters applicable requirements per feature
- Data type detection (personal, payment, health)

**Accessibility (WCAG)**:
- Static requirements by category (media, form, navigation)
- LLM adds feature-specific requirements

**Security (OWASP)**:
- Static Top 10 requirements by category
- LLM prioritizes (critical, high, medium)

**Edge Cases**:
- GitHub Search API (bugs, issues)
- Stack Exchange API (questions, answers)
- LLM knowledge base (known edge cases)

---

### How to Parse

**HTML Parsing** (iOS, Android pages):
```typescript
const $ = cheerio.load(html);
const content = $('.content-section')
  .toArray()
  .map(el => $(el).text())
  .join('\n\n');
```

**JSON Parsing** (GitHub, Stack Overflow APIs):
```typescript
const issues = response.json();
const edgeCases = issues.items.map(issue => ({
  scenario: issue.title,
  description: issue.body
}));
```

**LLM Extraction** (all sources):
```typescript
const prompt = `Extract guidelines relevant to "${feature.name}"...`;
const result = await openai.chat.completions.create({ /* ... */ });
return JSON.parse(result.choices[0].message.content);
```

---

### How to Match

**Two-stage matching**:

**Stage 1: Keyword pre-filter** (fast, eliminates 80%)
```typescript
const featureKeywords = extractKeywords(feature);
const relevant = guidelines.filter(g =>
  hasKeywordOverlap(featureKeywords, g)
);
```

**Stage 2: LLM relevance scoring** (accurate)
```typescript
const prompt = `Score relevance (0-1) of guidelines to feature...`;
// Returns: [{ guideline, score, reasoning }]
// Keep only score ≥ 0.6
```

---

## Documentation Files (7 Total)

| File | Lines | Content |
|------|-------|---------|
| `10_PHASE_9_OVERVIEW.md` | 207 | Overview, purpose, file index |
| `10a_PHASE_9_INFRASTRUCTURE.md` | 459 | Database, API, orchestrator, caching |
| `10b_PHASE_9_PLATFORM_GUIDELINES.md` | 667 | iOS, Android, App Store fetching |
| `10c_PHASE_9_LEGAL_COMPLIANCE.md` | 541 | GDPR, CCPA, copyright, age restrictions |
| `10d_PHASE_9_ACCESSIBILITY_SECURITY.md` | 629 | WCAG, OWASP requirements |
| `10e_PHASE_9_EDGE_CASES.md` | 626 | GitHub, SO, LLM mining |
| `10f_PHASE_9_UI.md` | 641 | Enrichment review UI |

**Total**: 3,770 lines across 7 files
**Average**: 539 lines per file
**Status**: ✅ **ALL MANAGEABLE** (no file over 670 lines)

---

## Example: Video Playback Enrichment

**Input**: "Video Playback" feature with 3 basic criteria

**After Phase 9 enrichment**:

### iOS Guidelines (5 items)
- Must support Picture-in-Picture mode
- Must handle audio session interruptions
- Must respect Low Power Mode
- Must provide AirPlay support
- Must handle external display connections

### Android Guidelines (5 items)
- Must use ExoPlayer for video playback
- Must support playback speed controls (0.5x - 2x)
- Must handle audio focus changes
- Must support Chromecast
- Must respect Data Saver mode

### App Store Requirements (3 items)
- Must not auto-play video with sound
- Must provide content ratings (MPAA/PEGI)
- Must implement parental controls for age-restricted content

### Google Play Requirements (3 items)
- Must not auto-play on cellular data without warning
- Must comply with content policy (no violence/adult without rating)
- Must implement battery optimization

### Accessibility (8 items)
- Must provide closed captions (1.2.2)
- Must provide audio descriptions (1.2.3)
- Must have keyboard controls (2.1.1)
- Must allow caption customization (color, size)
- Must announce buffering state to screen readers
- Must support VoiceOver/TalkBack navigation
- Must provide audio-only mode option
- Must have 4.5:1 contrast for controls (1.4.3)

### Security (4 items)
- Must encrypt video streams (OWASP A02:2021)
- Must implement DRM for premium content (OWASP A04:2021)
- Must validate video file format server-side (OWASP A03:2021)
- Must implement playback token expiration (OWASP A07:2021)

### Legal (3 items)
- Must verify content licensing rights
- Must implement age verification for 18+ content
- Must comply with copyright laws (DMCA)

### Edge Cases - High Priority (5 items)
- Network loss during playback → buffer and resume
- App backgrounded → pause playback, save position
- Headphones unplugged → pause immediately
- DRM license expired → show renewal prompt
- Corrupt video file → show friendly error

### Edge Cases - Medium Priority (6 items)
- Low battery → reduce video quality
- Slow network → adaptive bitrate streaming
- Seek during buffering → wait then jump
- Multiple videos queued → handle transitions
- Device rotated → adjust aspect ratio
- Picture-in-picture activated → resize player

**Total**: 42 enriched requirements (was 3, now 45 total)

---

## When to Run Phase 9

### After Phase 7 is Complete

**Validate first**:
1. App works (can upload documents)
2. Features are inferred correctly
3. Tickets are generated properly
4. You see value in core functionality

**Then run Phase 9**:
```bash
/implement-phase 9
```

**Duration**: 3 weeks (can be done incrementally)

**Result**: Tickets include platform-specific, legal, accessibility, security requirements

---

## Cost Estimate

**Per feature enriched**:
- Platform guidelines: $0.01
- Legal/compliance: $0.01
- Accessibility: $0.0075
- Security: $0.0075
- Edge cases: $0.015

**Total per feature**: ~$0.05 (OpenAI API)

**For 20 features**: ~$1.00
**For 100 features**: ~$5.00

**Affordable** - enrichment is cost-effective

---

## Configuration Required

**Add to .env.local** (optional):

```env
# Phase 9: External Enrichment
ENABLE_ENRICHMENT=true
GITHUB_TOKEN=ghp_...  # Optional: 5000 requests/hour (vs 60 without)
STACKOVERFLOW_API_KEY=...  # Optional: Stack Exchange API
ENRICHMENT_CACHE_TTL_DAYS=90
TARGET_MARKETS=US,EU,UK
ENRICHMENT_TIMEOUT_MS=180000  # 3 minutes per feature
```

**Without tokens**: Still works, just slower (uses rate-limited free APIs)

---

## Dependencies

**NPM packages**:
```bash
pnpm add cheerio bottleneck node-cache
pnpm add @types/cheerio -D
```

**APIs**:
- OpenAI (already configured) ✅
- GitHub API (free, optional token for higher limits)
- Stack Exchange API (free, optional key)

---

## File Organization

```
docs/
  10_PHASE_9_OVERVIEW.md              # Overview (this summary)
  10a_PHASE_9_INFRASTRUCTURE.md       # DB, API, orchestrator
  10b_PHASE_9_PLATFORM_GUIDELINES.md  # iOS, Android, App Store
  10c_PHASE_9_LEGAL_COMPLIANCE.md     # GDPR, CCPA, copyright
  10d_PHASE_9_ACCESSIBILITY_SECURITY.md # WCAG, OWASP
  10e_PHASE_9_EDGE_CASES.md           # GitHub, SO, LLM mining
  10f_PHASE_9_UI.md                   # Enrichment UI
```

**All files <670 lines** - sessions will read completely

---

## Answers to Your Questions

### Q: Does app generate epics and tickets?
**A**: ✅ YES - Phase 7 (weeks 9)

### Q: Does app infer features?
**A**: ✅ YES - Phase 4 (weeks 5-6)

### Q: Does app research Apple/Android guidelines?
**A**: ✅ YES - Phase 9.2 (web scraping + LLM extraction)

### Q: Does app research App Store certification?
**A**: ✅ YES - Phase 9.2 (fetches review guidelines)

### Q: Does app research legal compliance?
**A**: ✅ YES - Phase 9.3 (GDPR, CCPA, copyright, age restrictions)

### Q: Does app research accessibility?
**A**: ✅ YES - Phase 9.4 (WCAG 2.1 AA by feature category)

### Q: Does app research security?
**A**: ✅ YES - Phase 9.4 (OWASP Top 10 by feature type)

### Q: Does app generate edge cases?
**A**: ✅ YES - Phase 9.5 (GitHub + SO + LLM, 10-15 per feature)

**ALL YOUR REQUIREMENTS ARE NOW SPECIFIED WITH IMPLEMENTATION DETAILS**

---

## Status: COMPLETE ✅

**Phase 9 is**:
- ✅ Fully specified (HOW to fetch, parse, match)
- ✅ Split into 7 manageable files (all <670 lines)
- ✅ Optional/enhancement (run after MVP works)
- ✅ Testable (success criteria defined)
- ✅ Cost-effective (~$0.05 per feature)

**Ready to implement when you run**: `/implement-phase 9`

**But do Phases 0-7 FIRST** - validate core functionality, then add enrichment.
