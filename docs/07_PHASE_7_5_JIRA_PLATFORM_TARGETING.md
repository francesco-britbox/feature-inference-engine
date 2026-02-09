# Phase 7.5: Jira Platform Targeting & UI Fixes
**Duration**: 1-2 days (8-12 hours)
**Dependencies**: Phase 7 complete
**Type**: Enhancement + Bug Fixes

---

## Overview

This phase enhances the existing ticket generation system (Phase 7) with platform-aware export capabilities and fixes critical UI/UX issues discovered in user testing.

**Goals**:
1. Add platform targeting (web, iOS, Android, Flutter)
2. Implement subtask generation for stories
3. Fix UI navigation and broken links
4. Improve user experience across all pages

---

## Phase Structure

```
Phase 7.5
├── 7.5.1: Platform Targeting (4 hours)
├── 7.5.2: Subtask Generation (4 hours)
├── 7.5.3: UI/UX Fixes (2 hours)
└── 7.5.4: Testing & Documentation (2 hours)
```

---

## Task Breakdown

### 7.5.1: Platform Targeting Implementation

**Goal**: Enable platform-specific epic/story generation

#### Database Schema Updates
- [ ] Add `platforms` JSONB column to `features` table
  ```sql
  ALTER TABLE features ADD COLUMN platforms JSONB DEFAULT '["web", "ios", "android"]';
  ```
- [ ] Create migration file: `drizzle/migrations/add_platforms_to_features.sql`
- [ ] Update `lib/db/schema.ts` with new column type

#### Platform Filter Service
- [ ] Create `lib/services/PlatformFilterService.ts`
  ```typescript
  export class PlatformFilterService {
    // Rule-based keyword matching
    isFeatureRelevantForPlatform(feature: Feature, platform: Platform): boolean

    // Get platform-specific requirements
    getPlatformSpecificRequirements(platform: Platform): string[]

    // Filter features by platform
    filterFeaturesByPlatform(features: Feature[], platform: Platform): Feature[]
  }
  ```

#### Platform Rules Dictionary
- [ ] Create `lib/constants/platformRules.ts`
  ```typescript
  export const PLATFORM_KEYWORDS: Record<string, Platform[]> = {
    'purchase': ['ios', 'android'],
    'in-app': ['ios', 'android'],
    'storekit': ['ios'],
    'google play': ['android'],
    'camera': ['ios', 'android', 'flutter'],
    'notification': ['all'],
    'push': ['all'],
    'biometric': ['ios', 'android'],
    // ... more rules
  };
  ```

#### Update TicketService
- [ ] Modify `generateEpic()` to accept platform parameter
  ```typescript
  async generateEpic(featureId: string, platform?: Platform): Promise<JiraEpic>
  ```
- [ ] Filter stories based on platform relevance
- [ ] Add platform-specific notes to story descriptions

#### Export API Updates
- [ ] Update `/api/features/[id]/export` to accept `platform` query param
  ```typescript
  GET /api/features/:id/export?format=json&platform=ios
  ```
- [ ] Pass platform to TicketService

**Success Criteria**:
- ✅ Feature "In-App Purchase" excluded from web exports
- ✅ Feature "Push Notifications" included in all platform exports
- ✅ Platform parameter works in API: `/api/features/:id/export?platform=ios`

---

### 7.5.2: Subtask Generation

**Goal**: Break user stories into granular subtasks with time estimates

#### Type Definitions
- [ ] Add `JiraSubtask` interface to `lib/types/ticket.ts`
  ```typescript
  export interface JiraSubtask {
    title: string;
    description: string;
    timeEstimate: string; // e.g., "2h", "1d"
    parentStory: string;
    assignee?: string;
  }
  ```
- [ ] Add `subtasks: JiraSubtask[]` to `JiraStory` interface

#### Subtask Generator Service
- [ ] Create `lib/services/SubtaskGenerator.ts`
  ```typescript
  export class SubtaskGenerator {
    constructor(private llmClient: LLMClient) {}

    async generateSubtasks(
      story: JiraStory,
      platform: Platform,
      evidenceItems: Evidence[]
    ): Promise<JiraSubtask[]>
  }
  ```

#### LLM Prompts
- [ ] Create `lib/prompts/subtask.ts`
  ```typescript
  export function buildSubtaskPrompt(
    story: JiraStory,
    platform: Platform
  ): string
  ```
- [ ] Prompt should generate 5-10 subtasks per story
- [ ] Include time estimates (hours/days)
- [ ] Platform-specific implementation details

#### Integration
- [ ] Update `TicketService.generateStories()` to call SubtaskGenerator
- [ ] Add rate limiting for LLM calls (reuse existing `chatRateLimiter`)
- [ ] Handle errors gracefully (subtask generation is optional)

#### Export Format Updates
- [ ] Update `ExportService.exportToMarkdown()` to include subtasks
  ```markdown
  ### Story: User Authentication - UI
  **Subtasks**:
  - [ ] Create login form component (2h)
  - [ ] Add email validation (1h)
  - [ ] Implement password toggle (1h)
  ```
- [ ] Update JSON export to include subtasks array
- [ ] Update CSV export (optional - may be too complex)

**Success Criteria**:
- ✅ Each story has 5-10 subtasks
- ✅ Subtasks have time estimates
- ✅ Markdown export shows subtasks as checkboxes
- ✅ JSON export includes subtasks array
- ✅ iOS stories have iOS-specific subtasks (StoreKit, UIKit)
- ✅ Web stories have web-specific subtasks (React, HTML5)

---

### 7.5.3: UI/UX Fixes

**Goal**: Fix critical navigation and usability issues

#### Issue 1: Missing "Go Back" Buttons
**Problem**: Users can't navigate back from detail pages easily

**Pages to fix**:
- [ ] `/features/[id]/page.tsx` - Add back button to features list
- [ ] `/features/[id]/export/page.tsx` - Add back button to feature detail
- [ ] `/evidence` page - Add back button to home
- [ ] `/status` page - Add back button to home
- [ ] `/upload` page - Add back button to home

**Implementation**:
```tsx
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

<Link href="/features">
  <Button variant="ghost" size="sm">
    <ArrowLeft className="mr-2 h-4 w-4" />
    Back to Features
  </Button>
</Link>
```

**Placement**: Top-left of page, above the heading

#### Issue 2: Status Page - Spinning Icon When 0 Processing
**Problem**: Loader2 icon always spins even with 0 processing jobs

**File**: `app/status/page.tsx`, line 104

**Fix**:
```tsx
// Before (WRONG):
<Loader2 className="h-4 w-4 text-blue-600 animate-spin" />

// After (CORRECT):
<Loader2
  className={`h-4 w-4 text-blue-600 ${
    stats.documents.byStatus.processing > 0 ? 'animate-spin' : ''
  }`}
/>
```

#### Issue 3: Evidence Page - Source Column 404 Error
**Problem**: Clicking source link goes to 404 page

**File**: `app/evidence/page.tsx`

**Investigation needed**:
- [ ] Check current link format in source column
- [ ] Verify correct document URL format
- [ ] Test with actual document IDs

**Expected behavior**:
- Click "source.png" → Opens `/documents/[id]` or downloads file
- If documents page doesn't exist, remove link or show filename only

**Likely fix**:
```tsx
// Option 1: Remove link if no documents page exists
<TableCell>{item.documentFilename}</TableCell>

// Option 2: Link to documents page if it exists
<TableCell>
  <Link href={`/documents/${item.documentId}`}>
    {item.documentFilename}
  </Link>
</TableCell>

// Option 3: Download file directly
<TableCell>
  <a href={`/api/documents/${item.documentId}/download`}>
    {item.documentFilename}
  </a>
</TableCell>
```

**Success Criteria**:
- ✅ All pages have "Back" buttons in consistent location
- ✅ Processing icon only spins when processing > 0
- ✅ Evidence source column either works or is non-clickable

---

### 7.5.4: Platform Selector UI

**Goal**: Add platform selection to export page

#### Export Page Enhancement
- [ ] Update `app/features/[id]/export/page.tsx`
- [ ] Add platform selector dropdown above export buttons
  ```tsx
  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Select platform" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Platforms</SelectItem>
      <SelectItem value="web">Web</SelectItem>
      <SelectItem value="ios">iOS</SelectItem>
      <SelectItem value="android">Android</SelectItem>
      <SelectItem value="flutter">Flutter</SelectItem>
    </SelectContent>
  </Select>
  ```

#### Download Buttons Update
- [ ] Pass platform to download URL
  ```tsx
  function downloadFile(format: 'json' | 'md' | 'csv') {
    window.location.href =
      `/api/features/${featureId}/export?format=${format}&platform=${selectedPlatform}`;
  }
  ```

#### Preview Updates
- [ ] Show platform-filtered epic preview
- [ ] Display "Generated for: iOS" badge
- [ ] Update epic fetch to include platform parameter

**Success Criteria**:
- ✅ Platform dropdown visible on export page
- ✅ Changing platform updates preview
- ✅ Download includes platform in filename: `user-auth-ios.md`
- ✅ Downloaded file only has platform-relevant stories

---

## Implementation Order

### Day 1 (Morning): Platform Infrastructure
1. Database migration (30 min)
2. PlatformFilterService (1 hour)
3. Platform rules dictionary (1 hour)
4. Update TicketService (1.5 hours)

### Day 1 (Afternoon): Subtasks
1. Type definitions (15 min)
2. SubtaskGenerator service (2 hours)
3. LLM prompts (1 hour)
4. Integration with TicketService (45 min)

### Day 2 (Morning): UI Fixes
1. Add back buttons to all pages (1 hour)
2. Fix spinning loader issue (15 min)
3. Fix evidence source column (45 min)

### Day 2 (Afternoon): Platform UI & Real-Time Monitoring
1. Platform selector UI (1 hour)
2. Export format updates (1 hour)
3. Real-time monitoring (see 7.5.5 below) (3 hours)

### Day 3: Testing & Documentation
1. End-to-end testing (1 hour)
2. Documentation updates (1 hour)

---

### 7.5.5: Real-Time Monitoring & Auto-Processing

**Goal**: Add automatic queue processing and live activity monitoring

**CRITICAL BUG DISCOVERED**: Queue jobs sit in "pending" forever - no automatic processor!

#### Current Problem
- ❌ Upload PDF → Job created → **Sits in pending forever**
- ❌ Must manually call `POST /api/queue/process` to process
- ❌ No visibility into what's being processed
- ❌ Status page shows "0 processing" when 5 jobs are pending

#### Automatic Queue Processor
- [ ] Create `lib/workers/autoProcessor.ts`
  ```typescript
  let intervalId: NodeJS.Timeout | null = null;

  export function startAutoProcessor() {
    if (intervalId) return;

    intervalId = setInterval(async () => {
      const response = await fetch('/api/queue/process', {
        method: 'POST',
      });
      // Process queue every 5 seconds
    }, 5000);
  }

  export function stopAutoProcessor() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  ```
- [ ] Call `startAutoProcessor()` in `app/layout.tsx` on mount
- [ ] OR: Add to upload page as client-side polling

#### Activity Log System
- [ ] Create `lib/types/activity.ts`
  ```typescript
  export interface ActivityLog {
    id: string;
    timestamp: Date;
    level: 'info' | 'success' | 'error';
    message: string;
    documentId?: string;
    jobId?: string;
  }
  ```
- [ ] Create `lib/services/ActivityLogService.ts`
  - In-memory queue (last 100 entries)
  - Methods: `addLog()`, `getLogs()`, `clearLogs()`
- [ ] Update ExtractionService to log activity:
  ```typescript
  activityLog.add('Processing document X...')
  activityLog.add('Extracted 12 UI elements')
  activityLog.add('✅ Completed document X')
  ```

#### Activity API Endpoint
- [ ] Create `app/api/queue/activity/route.ts`
  ```typescript
  GET /api/queue/activity
  // Returns last 50 activity logs
  ```

#### Activity Monitor Component
- [ ] Create `components/ActivityMonitor.tsx`
  ```tsx
  export function ActivityMonitor() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);

    useEffect(() => {
      const interval = setInterval(async () => {
        const response = await fetch('/api/queue/activity');
        const data = await response.json();
        setLogs(data);
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }, []);

    return (
      <Card>
        <CardHeader>
          <CardTitle>🔴 Live Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-sm">
            {logs.map(log => (
              <div key={log.id}>
                <span className="text-muted-foreground">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>
                <span className={`ml-2 ${log.level === 'error' ? 'text-red-600' : ''}`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  ```

#### Status Page Updates
- [ ] Add ActivityMonitor component to `/app/status/page.tsx`
- [ ] Fix "Processing" card to show queue status, not document status
  ```tsx
  // BEFORE (wrong):
  <div>{stats.documents.byStatus.processing}</div>

  // AFTER (correct):
  <div>{stats.queue.processing}</div>
  ```
- [ ] Add "Auto-Process" toggle button (enable/disable auto-processor)

#### Upload Page Integration
- [ ] Show live activity feed during upload
- [ ] Auto-trigger queue processing after upload completes
- [ ] Real-time progress updates per file

**Success Criteria**:
- ✅ Upload PDF → Automatically processes within 5 seconds
- ✅ Live activity log shows "Processing document X..."
- ✅ Status page shows real-time queue activity
- ✅ No manual API calls needed
- ✅ Activity log persists for session (in-memory)
- ✅ Processing status accurate on all pages

**Time Estimate**: +3 hours
**Priority**: 🔴 HIGH (critical UX issue)

---

## Testing Plan

### Unit Tests
- [ ] PlatformFilterService.isFeatureRelevantForPlatform()
- [ ] SubtaskGenerator.generateSubtasks()
- [ ] Platform keyword matching logic

### Integration Tests
- [ ] Generate epic with platform=ios → no web-only features
- [ ] Generate epic with platform=web → no IAP features
- [ ] Subtasks generated for all stories
- [ ] Export formats include subtasks

### Manual Tests
- [ ] Upload document with IAP features
- [ ] Run inference
- [ ] Export for iOS → includes IAP
- [ ] Export for web → excludes IAP
- [ ] Check subtasks in markdown file
- [ ] Verify all back buttons work
- [ ] Verify processing icon only spins when active
- [ ] Verify evidence source links work

---

## Success Criteria

### Platform Targeting
- ✅ Can select platform: Web, iOS, Android, Flutter, All
- ✅ Platform-specific features filtered correctly
- ✅ API accepts `?platform=ios` parameter
- ✅ Export filename includes platform: `feature-ios.md`

### Subtask Generation
- ✅ Each story has 5-10 subtasks
- ✅ Subtasks have time estimates (hours/days)
- ✅ Platform-specific implementations (UIKit for iOS, React for web)
- ✅ Markdown shows subtasks as checkboxes
- ✅ JSON includes subtasks array

### UI/UX Fixes
- ✅ All pages have "Back" button
- ✅ Processing icon only spins when processing > 0
- ✅ Evidence source column works or is non-clickable
- ✅ Consistent navigation across all pages

### Export Quality
- ✅ iOS export has StoreKit subtasks
- ✅ Web export has React/HTML5 subtasks
- ✅ Android export has Jetpack Compose subtasks
- ✅ Markdown file is readable and well-formatted
- ✅ JSON is valid and Jira-importable

---

## File Changes Summary

### New Files (4 files)
```
lib/services/PlatformFilterService.ts    (150 lines)
lib/services/SubtaskGenerator.ts          (200 lines)
lib/prompts/subtask.ts                    (80 lines)
lib/constants/platformRules.ts            (100 lines)
drizzle/migrations/add_platforms.sql      (10 lines)
```

### Modified Files (8 files)
```
lib/db/schema.ts                          (+5 lines)
lib/types/ticket.ts                       (+10 lines)
lib/services/TicketService.ts             (+50 lines)
lib/services/ExportService.ts             (+30 lines)
app/api/features/[id]/export/route.ts     (+10 lines)
app/features/[id]/export/page.tsx         (+80 lines)
app/status/page.tsx                       (+5 lines - fix spinner)
app/evidence/page.tsx                     (+10 lines - fix source)
```

**Total**: ~700 new lines of code

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| LLM subtask generation too slow | Medium | Medium | Cache results, make optional |
| Platform rules incomplete | High | Low | Start with basic rules, expand over time |
| Evidence source fix breaks existing behavior | Low | Medium | Test thoroughly before commit |
| Subtask time estimates inaccurate | High | Low | Accept as estimates, allow manual edit |

---

## Code Quality Standards

All code must maintain **95%+ quality score**:

- ✅ TypeScript strict mode (no `any`)
- ✅ SOLID principles (SRP, OCP, LSP, ISP, DIP)
- ✅ DRY principle (zero duplication)
- ✅ Error handling with structured errors
- ✅ Logging at appropriate levels
- ✅ Unit tests for services
- ✅ Type safety (100% typed)
- ✅ Build successful (`pnpm build`)
- ✅ Zero lint violations (`pnpm lint`)
- ✅ Zero type errors (`pnpm typecheck`)

---

## Documentation Updates

- [ ] Update README.md with platform targeting feature
- [ ] Add examples to CLAUDE.md
- [ ] Create `docs/PLATFORM_TARGETING_GUIDE.md`
- [ ] Update `docs/06_IMPLEMENTATION_PHASES.md` to reference 7.5
- [ ] Add API documentation for platform parameter

---

## Example Output

### Before (Phase 7)
```markdown
# Epic: User Authentication

## User Stories

### Story: User Authentication - User Interface
- UI element present: Email input field
- UI element present: Password input field
- UI element present: Submit button
```

### After (Phase 7.5 - iOS)
```markdown
# Epic: User Authentication
**Platform**: iOS

## User Stories

### Story: User Authentication - iOS UI Implementation
**Subtasks**:
- [ ] Create UIKit login view controller (4h)
- [ ] Implement email text field with validation (2h)
- [ ] Add secure password field with visibility toggle (2h)
- [ ] Configure Face ID/Touch ID authentication (3h)
- [ ] Style submit button with activity indicator (1h)
- [ ] Add "Remember Me" toggle switch (1h)
- [ ] Implement keyboard accessory view (2h)

**Story Points**: 5
**Time Estimate**: ~15 hours
```

---

## Phase Completion Checklist

### Code Complete
- [ ] All services implemented
- [ ] All UI fixes applied
- [ ] All tests passing
- [ ] TypeScript: zero errors
- [ ] Lint: zero violations
- [ ] Build: successful

### Testing Complete
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Edge cases tested

### Documentation Complete
- [ ] README updated
- [ ] API docs updated
- [ ] Phase 7.5 doc created
- [ ] Code comments added

### Ready for Commit
- [ ] Code reviewed (95%+ score)
- [ ] Git commit with detailed message
- [ ] All files staged
- [ ] No uncommitted changes

---

## Commands Reference

```bash
# Database migration
pnpm db:generate
pnpm db:migrate

# Development
pnpm dev

# Testing
pnpm typecheck
pnpm lint
pnpm build

# Test specific feature
curl "http://localhost:3003/api/features/:id/export?format=md&platform=ios"
```

---

## Notes

- Platform targeting uses keyword matching (fast, no LLM calls)
- Subtask generation uses GPT-4o (slower, costs tokens)
- Make subtasks optional - if LLM fails, epic still exports
- UI fixes are quick wins - do these first for immediate UX improvement
- Platform rules can be expanded over time as new patterns emerge

---

**Status**: 📝 READY FOR IMPLEMENTATION
**Estimated Completion**: 2 days (12 hours)
**Depends On**: Phase 7 (✅ Complete)
**Enables**: Complete Jira export workflow with platform awareness

---

**Last Updated**: 2026-02-02
**Author**: Claude Opus 4.5
**Review Status**: Pending User Approval
