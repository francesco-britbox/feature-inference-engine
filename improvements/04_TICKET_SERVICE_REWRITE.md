# TicketService Rewrite - Hierarchical Epic Generation
## From Flat Features to Parent-Child Epic/Story Structure

> **MANDATORY**: Rewrite generateEpic() method EXACTLY as specified. Maintain backward compatibility for features without hierarchy.

---

## Current vs New Logic

### Current (WRONG)
```typescript
generateEpic(featureId) {
  feature = getFeature(featureId);  // Any feature
  stories = generateStoriesFromEvidenceTypes(feature);  // UI, API, Test stories

  return {
    title: feature.name,  // "User Login" becomes epic
    stories: [
      "User Login - UI Implementation",
      "User Login - API Implementation"
    ]
  };
}
```

### New (CORRECT)
```typescript
generateEpic(featureId) {
  feature = getFeature(featureId);

  // Only epics can be exported
  if (feature.featureType !== 'epic') {
    throw Error('Only epic-type features can be exported as epics');
  }

  // Get child features (stories)
  children = getChildFeatures(featureId);

  if (children.length > 0) {
    // Stories from CHILD FEATURES
    stories = children.map(child => {
      subtasks = generateSubtasksFromEvidence(child);
      return { title: child.name, subtasks };
    });
  } else {
    // Backward compatibility: No children → use evidence types
    stories = generateStoriesFromEvidenceTypes(feature);
  }

  return {
    title: feature.name,  // "User Authentication"
    stories: [
      { title: "User Login", subtasks: [...] },
      { title: "User Registration", subtasks: [...] }
    ]
  };
}
```

---

## Implementation Plan

### File: `lib/services/TicketService.ts`

**Total changes:** ~200 lines modified/added

---

## Step 1: Update generateEpic Method

**Current** (lines 49-101):
```typescript
async generateEpic(featureId: string, platform?: Platform): Promise<JiraEpic> {
  const feature = await this.getFeature(featureId);
  const outputs = await this.getOutputs(featureId);
  const evidenceList = await this.getEvidence(featureId);
  const stories = await this.generateStories(evidenceList, feature.name, platform);

  const epic: JiraEpic = {
    title: feature.name,
    description: this.buildEpicDescription(feature, outputs, platform),
    acceptanceCriteria: outputs.acceptanceCriteria || { scenarios: [], notes: [] },
    apiContracts: outputs.apiContract,
    requirements: outputs.requirements,
    stories,
    labels: this.extractLabels(feature, platform),
    priority: this.determinePriority(feature.confidenceScore),
    platform,
  };

  return epic;
}
```

**NEW** (replace lines 49-101):
```typescript
async generateEpic(featureId: string, platform?: Platform): Promise<JiraEpic> {
  logger.info({ featureId, platform }, 'Generating epic for feature');

  if (!featureId) {
    throw new InvalidDataError('Feature ID is required', 'featureId');
  }

  try {
    // Fetch feature WITH hierarchy fields
    const feature = await this.getFeatureWithType(featureId);

    // CRITICAL: Only epic-type features can be exported as epics
    if (feature.featureType !== 'epic') {
      throw new InvalidDataError(
        `Feature "${feature.name}" is type "${feature.featureType}", not "epic". Only epic-type features can be exported as Jira epics. Did you mean to export the parent feature?`,
        'featureType'
      );
    }

    // Get child features (stories under this epic)
    const childFeatures = await this.getChildFeatures(featureId);

    // Get outputs for epic-level data
    const outputs = await this.getOutputs(featureId);

    // Generate stories based on hierarchy
    let stories: JiraStory[];

    if (childFeatures.length > 0) {
      // NEW PATH: Generate stories from child features
      logger.info(
        { featureId, childCount: childFeatures.length },
        'Generating stories from child features'
      );
      stories = await this.generateStoriesFromChildren(childFeatures, platform);
    } else {
      // BACKWARD COMPATIBILITY: No children → use evidence types
      logger.info(
        { featureId },
        'No child features found, generating stories from evidence types (legacy mode)'
      );
      const evidenceList = await this.getEvidence(featureId);
      stories = await this.generateStories(evidenceList, feature.name, platform);
    }

    // Determine priority based on confidence score
    const priority = this.determinePriority(feature.confidenceScore);

    // Build epic description
    const description = this.buildEpicDescription(feature, outputs, platform);

    // Build epic
    const epic: JiraEpic = {
      title: feature.name,
      description,
      acceptanceCriteria: outputs.acceptanceCriteria || { scenarios: [], notes: [] },
      apiContracts: outputs.apiContract,
      requirements: outputs.requirements,
      stories,
      labels: this.extractLabels(feature, platform),
      priority,
      platform,
    };

    logger.info(
      { featureId, platform, storiesCount: stories.length, mode: childFeatures.length > 0 ? 'hierarchical' : 'legacy' },
      'Epic generated successfully'
    );

    return epic;
  } catch (error) {
    logger.error(
      { featureId, error: error instanceof Error ? error.message : String(error) },
      'Failed to generate epic'
    );
    throw error;
  }
}
```

---

## Step 2: Add New Helper Methods

### Method 1: getFeatureWithType (NEW)
```typescript
/**
 * Get feature WITH hierarchy fields
 */
private async getFeatureWithType(
  featureId: string
): Promise<{
  name: string;
  description: string | null;
  confidenceScore: string | null;
  featureType: string;
  parentId: string | null;
}> {
  const [feature] = await db
    .select({
      name: features.name,
      description: features.description,
      confidenceScore: features.confidenceScore,
      featureType: features.featureType,
      parentId: features.parentId,
    })
    .from(features)
    .where(eq(features.id, featureId));

  if (!feature) {
    throw new NotFoundError('Feature', featureId);
  }

  return feature;
}
```

### Method 2: getChildFeatures (NEW)
```typescript
/**
 * Get child features (stories under an epic)
 */
private async getChildFeatures(parentId: string): Promise<Array<{
  id: string;
  name: string;
  description: string | null;
  confidenceScore: string | null;
  featureType: string;
}>> {
  const children = await db
    .select({
      id: features.id,
      name: features.name,
      description: features.description,
      confidenceScore: features.confidenceScore,
      featureType: features.featureType,
    })
    .from(features)
    .where(eq(features.parentId, parentId));

  logger.debug(
    { parentId, childCount: children.length },
    'Fetched child features'
  );

  return children;
}
```

### Method 3: generateStoriesFromChildren (NEW)
```typescript
/**
 * Generate Jira stories from child features (hierarchical mode)
 * Each child feature becomes a story with evidence-based subtasks
 */
private async generateStoriesFromChildren(
  childFeatures: Array<{
    id: string;
    name: string;
    description: string | null;
    confidenceScore: string | null;
  }>,
  platform?: Platform
): Promise<JiraStory[]> {
  const stories: JiraStory[] = [];

  for (const child of childFeatures) {
    // Get evidence for this child feature
    const childEvidence = await this.getEvidence(child.id);

    // Group evidence by type
    const grouped = this.groupEvidenceByType(childEvidence);

    // Build story description from evidence
    const description = this.buildStoryDescriptionFromEvidence(child, grouped, platform);

    // Build acceptance criteria from evidence
    const acceptanceCriteria = this.buildAcceptanceCriteriaFromEvidence(grouped);

    // Estimate story points
    const storyPoints = this.estimateStoryPoints(childEvidence);

    // Generate subtasks from evidence (NEW: evidence becomes subtasks, not stories)
    let subtasks = [];
    if (platform) {
      try {
        // Use evidence to generate implementation subtasks
        subtasks = await this.subtaskGenerator.generateSubtasksFromEvidence(
          child.name,
          childEvidence,
          platform
        );
      } catch (error) {
        logger.warn(
          {
            childFeature: child.name,
            error: error instanceof Error ? error.message : String(error),
          },
          'Failed to generate subtasks, continuing without them'
        );
      }
    }

    // Create story
    stories.push({
      title: child.name, // Use child feature name directly (e.g., "User Login")
      description,
      acceptanceCriteria,
      subtasks,
      storyPoints,
      labels: platform ? [platform, 'feature-story'] : ['feature-story'],
      priority: this.determinePriority(child.confidenceScore),
      evidenceIds: childEvidence.map(e => e.id),
    });
  }

  return stories;
}
```

### Method 4: buildStoryDescriptionFromEvidence (NEW)
```typescript
/**
 * Build story description from evidence items
 */
private buildStoryDescriptionFromEvidence(
  child: { name: string; description: string | null },
  grouped: Record<EvidenceType, EvidenceItem[]>,
  platform?: Platform
): string {
  const parts: string[] = [];

  // Story introduction
  parts.push(child.description || `Implement ${child.name} functionality.`);
  parts.push('');

  // Platform-specific note
  if (platform) {
    parts.push(`**Platform**: ${PLATFORM_NAMES[platform]}`);
    parts.push(`**Tech Stack**: ${PLATFORM_TECH_STACKS[platform].join(', ')}`);
    parts.push('');
  }

  // Evidence sections
  if (grouped.endpoint.length > 0) {
    parts.push('## API Endpoints');
    grouped.endpoint.forEach(e => parts.push(`- ${e.content}`));
    parts.push('');
  }

  if (grouped.ui_element.length > 0) {
    parts.push('## UI Elements');
    grouped.ui_element.forEach(e => parts.push(`- ${e.content}`));
    parts.push('');
  }

  if (grouped.requirement.length > 0) {
    parts.push('## Requirements');
    grouped.requirement.forEach(e => parts.push(`- ${e.content}`));
    parts.push('');
  }

  return parts.join('\n');
}
```

### Method 5: buildAcceptanceCriteriaFromEvidence (NEW)
```typescript
/**
 * Build acceptance criteria from all evidence types
 */
private buildAcceptanceCriteriaFromEvidence(
  grouped: Record<EvidenceType, EvidenceItem[]>
): string[] {
  const criteria: string[] = [];

  // From explicit acceptance criteria
  grouped.acceptance_criteria.forEach(e => {
    criteria.push(e.content);
  });

  // From endpoints
  grouped.endpoint.forEach(e => {
    criteria.push(`API endpoint implemented: ${e.content}`);
  });

  // From UI elements
  grouped.ui_element.forEach(e => {
    criteria.push(`UI element present: ${e.content}`);
  });

  // From edge cases
  grouped.edge_case.forEach(e => {
    criteria.push(`Edge case handled: ${e.content}`);
  });

  return criteria;
}
```

---

## Step 3: Update SubtaskGenerator (NEW METHOD)

**File**: `lib/services/SubtaskGenerator.ts`

**Add new method** (after existing generateSubtasks):
```typescript
/**
 * Generate subtasks from evidence items (for hierarchical stories)
 * Uses evidence as basis for subtask generation
 */
async generateSubtasksFromEvidence(
  storyName: string,
  evidenceItems: Array<{ id: string; type: string; content: string }>,
  platform: Platform
): Promise<JiraSubtask[]> {
  // Build prompt with evidence
  const prompt = this.buildEvidenceBasedSubtaskPrompt(storyName, evidenceItems, platform);

  const response = await chatRateLimiter.schedule(() =>
    this.llmClient.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 3000,
      responseFormat: { type: 'json_object' },
    })
  );

  if (!response.content) {
    return [];
  }

  const parsed = JSON.parse(response.content) as { subtasks: JiraSubtask[] };
  return parsed.subtasks || [];
}

/**
 * Build prompt for evidence-based subtask generation
 */
private buildEvidenceBasedSubtaskPrompt(
  storyName: string,
  evidenceItems: Array<{ id: string; type: string; content: string }>,
  platform: Platform
): string {
  const platformName = PLATFORM_NAMES[platform];
  const techStack = PLATFORM_TECH_STACKS[platform].join(', ');

  const evidenceText = evidenceItems
    .map((e, i) => `${i + 1}. [${e.type}] ${e.content}`)
    .join('\n');

  return `
Generate implementation subtasks for this user story based on the evidence provided.

STORY: ${storyName}
PLATFORM: ${platformName}
TECH STACK: ${techStack}

EVIDENCE:
${evidenceText}

INSTRUCTIONS:
Break down this story into 5-8 concrete implementation subtasks.
- Each subtask should be a specific technical task
- Use platform-specific technologies (${techStack})
- Base subtasks on the evidence provided (API, UI, requirements)
- Include time estimates (hours or days)

OUTPUT (JSON):
{
  "subtasks": [
    {
      "title": "Create login form component",
      "description": "Build reusable login form with email/password fields using UIKit",
      "timeEstimate": "4h"
    },
    ...
  ]
}
`.trim();
}
```

---

## Step 4: Example Transformation

### Before (Current System)

**Input:** Generate epic for "User Login" feature

**Output:**
```json
{
  "summary": "User Login",
  "issueType": "Epic",
  "issues": [
    {
      "summary": "User Login - UI Implementation",
      "issueType": "Story",
      "description": "Implement UI components...",
      "acceptanceCriteria": ["UI element present: Login button"]
    },
    {
      "summary": "User Login - API Implementation",
      "issueType": "Story",
      "description": "Implement API endpoints...",
      "acceptanceCriteria": ["API implemented: POST /api/login"]
    }
  ]
}
```

**Problem:** "User Login" is too specific to be an epic.

---

### After (Hierarchical System)

**Input:** Generate epic for "User Authentication" feature (parent)

**Query:**
```sql
SELECT * FROM features WHERE id = 'auth_id';
-- Returns: name="User Authentication", feature_type="epic"

SELECT * FROM features WHERE parent_id = 'auth_id';
-- Returns: [
--   { name="User Login", feature_type="story" },
--   { name="User Registration", feature_type="story" },
--   { name="User Logout", feature_type="story" }
-- ]
```

**Output:**
```json
{
  "summary": "User Authentication",
  "issueType": "Epic",
  "issues": [
    {
      "summary": "User Login",
      "issueType": "Story",
      "description": "Implement user login functionality with email/password authentication.",
      "acceptanceCriteria": [
        "User can log in with valid credentials",
        "Error message shown for invalid credentials",
        "Session token generated on successful login"
      ],
      "subtasks": [
        {
          "summary": "Create login form component",
          "description": "Build UIKit view controller with email/password fields",
          "timeEstimate": "4h"
        },
        {
          "summary": "Implement authentication API call",
          "description": "POST to /api/auth/login with credential validation",
          "timeEstimate": "3h"
        },
        {
          "summary": "Add biometric authentication support",
          "description": "Integrate Touch ID / Face ID for iOS login",
          "timeEstimate": "5h"
        }
      ]
    },
    {
      "summary": "User Registration",
      "issueType": "Story",
      "description": "Allow new users to create accounts.",
      "subtasks": [...]
    },
    {
      "summary": "User Logout",
      "issueType": "Story",
      "description": "Users can log out and clear session.",
      "subtasks": [...]
    }
  ]
}
```

**Result:** Proper epic with meaningful stories ✅

---

## Step 5: Backward Compatibility

**For features WITHOUT children (orphans):**

```typescript
if (childFeatures.length === 0) {
  // Use OLD logic (evidence-based stories)
  stories = await this.generateStories(evidenceList, feature.name, platform);
}
```

**This ensures:**
- Features created before hierarchy detection still work
- Standalone features (no parent, no children) export normally
- No breaking changes to existing exports

**Example:**
```
Feature: "Footer Navigation" (epic, no children)
└─ Falls back to evidence-based stories:
   ├─ Footer Navigation - UI Implementation
   └─ Footer Navigation - Testing
```

---

## Step 6: Update Export API

**File**: `app/api/features/[id]/export/route.ts`

**Current** (around line 30-50):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  // ... validation

  // Generate epic (works for any feature)
  const epic = await ticketService.generateEpic(id, platform);

  // ... export logic
}
```

**NEW** (add validation):
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    // Get feature to check type
    const [feature] = await db
      .select({ name: features.name, featureType: features.featureType })
      .from(features)
      .where(eq(features.id, id));

    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // Validate feature is an epic
    if (feature.featureType !== 'epic') {
      return NextResponse.json(
        {
          error: 'Invalid feature type',
          message: `Feature "${feature.name}" is type "${feature.featureType}", not "epic". Only epic-type features can be exported. Please export the parent epic instead.`,
          featureType: feature.featureType,
        },
        { status: 400 }
      );
    }

    // ... validation

    // Generate epic (only works for epic-type features now)
    const epic = await ticketService.generateEpic(id, platform);

    // ... export logic
  } catch (error) {
    if (error instanceof InvalidDataError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Export failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
```

---

## Step 7: Handle Edge Cases

### Edge Case 1: Feature has parent but is marked as epic
**Constraint prevents this** (database check: epics must have parent_id=NULL)

### Edge Case 2: Circular reference (A → B → A)
**Handled by FeatureHierarchyService.validateNoCircularReferences()**

### Edge Case 3: Deep nesting (epic → story → task → subtask)
**Maximum depth: 2** (epic → story → task)
**Database constraint:** `hierarchy_level <= 2`
**Tasks cannot have children** (enforced in FeatureHierarchyService)

### Edge Case 4: Orphaned stories (story with no parent)
**Two approaches:**

**Option A: Prevent at inference time**
```typescript
// In FeatureHierarchyService, if story has no parent:
if (feature.featureType === 'story' && !foundParent) {
  // Reclassify as epic (standalone)
  feature.featureType = 'epic';
  feature.hierarchyLevel = 0;
}
```

**Option B: Reject at export time**
```typescript
// In export API, check:
if (feature.featureType === 'story' && !feature.parentId) {
  return error('Story has no parent epic, cannot export');
}
```

**Recommendation:** Use Option A (auto-promote orphaned stories to epics)

### Edge Case 5: Story exported directly (not parent epic)
**Handled:** Export API validates feature_type === 'epic', returns 400 error with helpful message.

---

## Step 8: Update Jira Generation Wizard

**File**: `app/jira/page.tsx`

**Current** (line 115-170):
```typescript
// Fetches ALL features, generates epic for each
const featuresResponse = await fetch('/api/features');
const features = await featuresResponse.json();

const epicsData = await Promise.all(
  features.map(async (feature) => {
    const epicResponse = await fetch(`/api/features/${feature.id}/export?format=json&platform=${platform}`);
    // ...
  })
);
```

**NEW** (filter to epics only):
```typescript
// Fetch only EPIC-type features
const featuresResponse = await fetch('/api/features?type=epic');
const epicFeatures = await featuresResponse.json();

// Filter further to features without parents (root epics)
const rootEpics = epicFeatures.filter(f => !f.parentId);

const epicsData = await Promise.all(
  rootEpics.map(async (feature) => {
    const epicResponse = await fetch(`/api/features/${feature.id}/export?format=json&platform=${platform}`);
    // ...
  })
);
```

**Add filtering endpoint:**

**File**: `app/api/features/route.ts`

**Add query parameter support:**
```typescript
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const typeFilter = searchParams.get('type'); // epic, story, task
  const parentFilter = searchParams.get('parent'); // 'null' for root, UUID for children

  let query = db.select().from(features);

  // Filter by type
  if (typeFilter && ['epic', 'story', 'task'].includes(typeFilter)) {
    query = query.where(eq(features.featureType, typeFilter));
  }

  // Filter by parent
  if (parentFilter === 'null') {
    query = query.where(isNull(features.parentId));
  } else if (parentFilter) {
    query = query.where(eq(features.parentId, parentFilter));
  }

  const result = await query;

  return NextResponse.json(result);
}
```

---

## Testing Strategy

### Test 1: Hierarchical Epic Generation
```typescript
// Given: User Authentication epic with Login story child
const epic = await ticketService.generateEpic('auth_id', 'ios');

expect(epic.title).toBe('User Authentication');
expect(epic.stories).toHaveLength(1); // User Login story
expect(epic.stories[0].title).toBe('User Login'); // NOT "User Auth - UI Implementation"
expect(epic.stories[0].subtasks).toHaveLength(5-8); // Evidence → subtasks
```

### Test 2: Backward Compatibility
```typescript
// Given: Feature with no children
const epic = await ticketService.generateEpic('standalone_id');

expect(epic.stories).toHaveLength(2); // Evidence-based: UI + API stories
expect(epic.stories[0].title).toMatch(/- UI Implementation$/); // Legacy format
```

### Test 3: Non-Epic Export Rejection
```typescript
// Given: Story-type feature
await expect(
  ticketService.generateEpic('login_story_id')
).rejects.toThrow('Only epic-type features can be exported as epics');
```

---

## Migration of Existing Exports

**Existing features in system: 17**

**After hierarchy detection:**
- 6 epics (exportable)
- 11 stories (not directly exportable, accessed via parent)

**User workflow change:**
- **Before:** Export any of 17 features as epic
- **After:** Export only 6 parent epics, stories included automatically

**UI update needed:** Features list shows "Export" button ONLY for epics

---

## MANDATORY IMPLEMENTATION CHECKLIST

**TicketService Changes:**
- [ ] Update `generateEpic()` method (lines 49-101)
- [ ] Add feature type validation
- [ ] Add `getFeatureWithType()` method
- [ ] Add `getChildFeatures()` method
- [ ] Add `generateStoriesFromChildren()` method
- [ ] Add `buildStoryDescriptionFromEvidence()` method
- [ ] Add `buildAcceptanceCriteriaFromEvidence()` method
- [ ] Keep backward compatibility for childless features
- [ ] Update error messages to be helpful

**SubtaskGenerator Updates:**
- [ ] Add `generateSubtasksFromEvidence()` method
- [ ] Add `buildEvidenceBasedSubtaskPrompt()` method

**API Updates:**
- [ ] Update `app/api/features/[id]/export/route.ts` with type validation
- [ ] Add `type` query parameter to `app/api/features/route.ts`
- [ ] Add `parent` query parameter support

**Verification:**
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] Export epic-type feature → works
- [ ] Export story-type feature → returns 400 error
- [ ] Epic with children → generates stories from children
- [ ] Epic without children → falls back to evidence stories
- [ ] Code review score 95%+

**If ANY fails, you have FAILED.**

---

## Expected Behavior Examples

### Example 1: Exporting User Authentication (Epic with Children)
```
Input: featureId = "auth_epic_id"
Query: SELECT * FROM features WHERE parent_id = "auth_epic_id"
Returns: [Login, Registration, Logout] (3 stories)

Output:
Epic: User Authentication
├─ Story: User Login (from child feature)
│  ├─ Subtask: Create login form (from evidence)
│  ├─ Subtask: Implement authentication API (from evidence)
│  └─ Subtask: Add error handling (from evidence)
├─ Story: User Registration (from child feature)
│  └─ Subtasks from evidence
└─ Story: User Logout (from child feature)
   └─ Subtasks from evidence
```

### Example 2: Exporting Footer Navigation (Epic without Children)
```
Input: featureId = "footer_id"
Query: SELECT * FROM features WHERE parent_id = "footer_id"
Returns: [] (no children)

Fallback: Use evidence-based story generation (legacy mode)

Output:
Epic: Footer Navigation
├─ Story: Footer Navigation - UI Implementation (from evidence type)
└─ Story: Footer Navigation - Testing (from evidence type)
```

### Example 3: Attempting to Export "User Login" (Story Type)
```
Input: featureId = "login_id"
Query: SELECT feature_type FROM features WHERE id = "login_id"
Returns: "story"

Error: 400 Bad Request
{
  "error": "Feature 'User Login' is type 'story', not 'epic'.
           Only epic-type features can be exported as Jira epics.
           Please export the parent epic 'User Authentication' instead."
}
```

---

## File Size: ~470 lines ✅
**Next**: Read `05_UI_HIERARCHY_SUPPORT.md`
