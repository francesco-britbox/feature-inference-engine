# UI Hierarchy Support - Tree Views and Editing
## Visual Feature Hierarchy in Features Page and Jira Wizard

> **MANDATORY**: Implement ALL UI components. Users MUST be able to see and edit hierarchy.

---

## Overview

**Scope**: 4 UI updates
1. Features list page (tree view)
2. Feature detail page (show parent/children)
3. Jira wizard (hierarchical selection)
4. Manual hierarchy editing

**Estimated effort**: 4-5 hours

---

## UI Update 1: Features Page Tree View

**File**: `app/features/page.tsx`

**Current**: Flat table of 17 features

**NEW**: Hierarchical tree with expand/collapse

### Implementation

```typescript
'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder } from 'lucide-react';

interface FeatureWithChildren {
  id: string;
  name: string;
  featureType: 'epic' | 'story' | 'task';
  confidenceScore: string;
  status: string;
  parentId: string | null;
  children?: FeatureWithChildren[];
  expanded?: boolean;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureWithChildren[]>([]);

  useEffect(() => {
    fetchFeaturesTree();
  }, []);

  const fetchFeaturesTree = async () => {
    // Fetch all features
    const response = await fetch('/api/features');
    const allFeatures = await response.json();

    // Build tree structure (epics at root)
    const tree = buildTree(allFeatures);
    setFeatures(tree);
  };

  const buildTree = (flatList: any[]): FeatureWithChildren[] => {
    // Create map for quick lookup
    const map = new Map<string, FeatureWithChildren>();
    flatList.forEach(f => {
      map.set(f.id, { ...f, children: [], expanded: false });
    });

    // Build tree
    const roots: FeatureWithChildren[] = [];

    flatList.forEach(f => {
      const node = map.get(f.id)!;

      if (f.parentId && map.has(f.parentId)) {
        // Add to parent's children
        const parent = map.get(f.parentId)!;
        parent.children!.push(node);
      } else {
        // Root node (epic with no parent)
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpanded = (featureId: string) => {
    const toggle = (items: FeatureWithChildren[]): FeatureWithChildren[] => {
      return items.map(item => {
        if (item.id === featureId) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children && item.children.length > 0) {
          return { ...item, children: toggle(item.children) };
        }
        return item;
      });
    };

    setFeatures(prev => toggle(prev));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic': return <FolderOpen className="h-4 w-4 text-blue-600" />;
      case 'story': return <FileText className="h-4 w-4 text-green-600" />;
      case 'task': return <FileText className="h-4 w-4 text-gray-600" />;
      default: return <Folder className="h-4 w-4" />;
    }
  };

  const renderTree = (items: FeatureWithChildren[], depth: number = 0) => {
    return items.map(item => (
      <div key={item.id}>
        {/* Feature row */}
        <div
          className={`flex items-center gap-2 py-2 px-4 hover:bg-gray-50 cursor-pointer`}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          {/* Expand/collapse button */}
          {item.children && item.children.length > 0 ? (
            <button onClick={() => toggleExpanded(item.id)}>
              {item.expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-4" /> // Spacer for leaf nodes
          )}

          {/* Type icon */}
          {getTypeIcon(item.featureType)}

          {/* Feature name */}
          <Link href={`/features/${item.id}`} className="flex-1">
            <span className="font-medium">{item.name}</span>
          </Link>

          {/* Type badge */}
          <Badge variant={item.featureType === 'epic' ? 'default' : 'outline'}>
            {item.featureType}
          </Badge>

          {/* Confidence */}
          <Badge variant="secondary">
            {(parseFloat(item.confidenceScore) * 100).toFixed(0)}%
          </Badge>

          {/* Children count */}
          {item.children && item.children.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {item.children.length} {item.featureType === 'epic' ? 'stories' : 'tasks'}
            </Badge>
          )}

          {/* Export button (epics only) */}
          {item.featureType === 'epic' && (
            <Link href={`/features/${item.id}/export`}>
              <Button size="sm" variant="outline">
                Export
              </Button>
            </Link>
          )}
        </div>

        {/* Render children recursively */}
        {item.expanded && item.children && item.children.length > 0 && (
          <div className="border-l-2 border-gray-200 ml-4">
            {renderTree(item.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Features</h1>
        <p className="text-muted-foreground mt-2">
          Hierarchical view of inferred features (epics contain stories)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Tree ({features.length} epics)</CardTitle>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No features found. Run inference first.
            </p>
          ) : (
            renderTree(features)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## UI Update 2: Feature Detail Page

**File**: `app/features/[id]/page.tsx`

**Add parent/children section:**

```typescript
export default function FeatureDetailPage({ params }) {
  const [feature, setFeature] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);

  useEffect(() => {
    fetchFeature();
    fetchHierarchy();
  }, [params.id]);

  const fetchHierarchy = async () => {
    const response = await fetch(`/api/features/${params.id}/hierarchy`);
    const data = await response.json();
    setHierarchy(data);
  };

  return (
    <div>
      {/* Existing feature info */}

      {/* NEW: Hierarchy Section */}
      <Card>
        <CardHeader>
          <CardTitle>Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parent (if exists) */}
          {hierarchy?.parent && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Parent Epic:</p>
              <Link href={`/features/${hierarchy.parent.id}`}>
                <Card className="hover:bg-gray-50 cursor-pointer">
                  <CardContent className="flex items-center gap-2 py-3">
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{hierarchy.parent.name}</span>
                    <Badge variant="outline">epic</Badge>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          {/* Children (if exists) */}
          {hierarchy?.children && hierarchy.children.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Child Stories ({hierarchy.children.length}):
              </p>
              <div className="space-y-2">
                {hierarchy.children.map(child => (
                  <Link key={child.id} href={`/features/${child.id}`}>
                    <Card className="hover:bg-gray-50 cursor-pointer">
                      <CardContent className="flex items-center gap-2 py-3">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{child.name}</span>
                        <Badge variant="outline">{child.featureType}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb (ancestors) */}
          {hierarchy?.ancestors && hierarchy.ancestors.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Path:</p>
              <div className="flex items-center gap-2 text-sm">
                {hierarchy.ancestors.map((ancestor, idx) => (
                  <span key={ancestor.id} className="flex items-center gap-2">
                    {idx > 0 && <span>/</span>}
                    <Link href={`/features/${ancestor.id}`} className="text-blue-600 hover:underline">
                      {ancestor.name}
                    </Link>
                  </span>
                ))}
                <span>/</span>
                <span className="font-medium">{feature?.name}</span>
              </div>
            </div>
          )}

          {/* Standalone indicator */}
          {!hierarchy?.parent && (!hierarchy?.children || hierarchy.children.length === 0) && (
            <p className="text-sm text-muted-foreground">
              This is a standalone {feature?.featureType}. No parent or children.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Add API endpoint:**

**File**: `app/api/features/[id]/hierarchy/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { featureHierarchyService } from '@/lib/services/FeatureHierarchyService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const hierarchy = await featureHierarchyService.getHierarchyTree(id);
    return NextResponse.json(hierarchy);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch hierarchy' },
      { status: 500 }
    );
  }
}
```

---

## UI Update 3: Jira Wizard Filtering

**File**: `app/jira/page.tsx`

**Current** (line 436-490):
```typescript
const featuresResponse = await fetch('/api/features');
const features = await featuresResponse.json();

// Generates epic for ALL features (wrong)
```

**NEW**:
```typescript
// Fetch only EPIC-type features (root level)
const featuresResponse = await fetch('/api/features?type=epic&parent=null');
const epicFeatures = await featuresResponse.json();

// Filter out stories (they'll be included via parent epics)
```

**Update tree selector to show hierarchy:**

**File**: `components/JiraTreeSelector.tsx` (line 70-110)

**Keep current logic** - it already calls `/api/features/${id}/export` which will:
1. Validate feature is epic
2. Fetch children
3. Generate stories from children

**No changes needed to JiraTreeSelector** ✅

---

## UI Update 4: Manual Hierarchy Editing

**File**: `app/features/[id]/page.tsx`

**Add "Set Parent" dialog:**

```typescript
const [setParentDialogOpen, setSetParentDialogOpen] = useState(false);
const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
const [potentialParents, setPotentialParents] = useState([]);

const fetchPotentialParents = async () => {
  // Fetch epic-type features (candidates for parent)
  const response = await fetch('/api/features?type=epic');
  const epics = await response.json();

  // Filter out self and current children
  const filtered = epics.filter(e =>
    e.id !== feature.id &&
    !hierarchy?.children?.some(c => c.id === e.id)
  );

  setPotentialParents(filtered);
};

const handleSetParent = async () => {
  if (!selectedParentId) return;

  try {
    const response = await fetch(`/api/features/${feature.id}/parent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: selectedParentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to set parent');
    }

    // Refresh
    await fetchFeature();
    await fetchHierarchy();
    setSetParentDialogOpen(false);
  } catch (error) {
    alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// In JSX
<Dialog open={setParentDialogOpen} onOpenChange={setSetParentDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Set Parent Feature</DialogTitle>
      <DialogDescription>
        Choose a parent epic for "{feature?.name}"
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-3">
      {potentialParents.map(parent => (
        <Card
          key={parent.id}
          className={`cursor-pointer ${selectedParentId === parent.id ? 'border-2 border-primary' : ''}`}
          onClick={() => setSelectedParentId(parent.id)}
        >
          <CardContent className="flex items-center gap-2 py-3">
            <FolderOpen className="h-4 w-4" />
            <span>{parent.name}</span>
            <Badge>{parent.confidenceScore}%</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setSetParentDialogOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSetParent} disabled={!selectedParentId}>
        Set Parent
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Add API endpoint:**

**File**: `app/api/features/[id]/parent/route.ts` (NEW)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { features } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PUT /api/features/:id/parent
 * Manually set parent for a feature
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const body = await request.json();
  const { parentId } = body;

  try {
    // Validate parent exists and is an epic
    if (parentId) {
      const [parent] = await db
        .select({ featureType: features.featureType })
        .from(features)
        .where(eq(features.id, parentId));

      if (!parent) {
        return NextResponse.json({ error: 'Parent feature not found' }, { status: 404 });
      }

      if (parent.featureType !== 'epic') {
        return NextResponse.json(
          { error: 'Parent must be an epic-type feature' },
          { status: 400 }
        );
      }
    }

    // Update parent_id
    await db
      .update(features)
      .set({
        parentId: parentId || null,
        featureType: parentId ? 'story' : 'epic', // Auto-adjust type
        hierarchyLevel: parentId ? 1 : 0,
      })
      .where(eq(features.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to set parent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/:id/parent
 * Remove parent (make standalone epic)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    await db
      .update(features)
      .set({
        parentId: null,
        featureType: 'epic',
        hierarchyLevel: 0,
      })
      .where(eq(features.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove parent' },
      { status: 500 }
    );
  }
}
```

---

## Visual Examples

### Features Page (Tree View)

```
┌─────────────────────────────────────────────────────────┐
│ Features (6 epics)                                      │
├─────────────────────────────────────────────────────────┤
│ 📁 User Authentication              [epic] 98%  [Export]│
│ │  ├─ 📄 User Login                [story] 90%          │
│ │  └─ 📄 User Registration         [story] 85%          │
│                                                          │
│ 📁 Content Discovery                [epic] 90%  [Export]│
│ │  ├─ 📄 Search and User Profile   [story] 66%          │
│ │  └─ 📄 Content Navigation        [story] 95%          │
│                                                          │
│ 📁 Modal System                     [epic] 85%  [Export]│
│ │  ├─ 📄 Modal Window Closure      [story] 95%          │
│ │  └─ 📄 Close Modal Window        [story] 73%          │
│                                                          │
│ 📁 Footer Navigation                [epic] 90%  [Export]│
│    (no children - standalone)                           │
└─────────────────────────────────────────────────────────┘
```

### Feature Detail Page (Hierarchy Section)

```
┌─────────────────────────────────────────────────┐
│ Hierarchy                                       │
├─────────────────────────────────────────────────┤
│ Parent Epic:                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📁 User Authentication        [epic] 98%    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Sibling Stories:                                │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📄 User Registration          [story] 85%   │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📄 User Logout                [story] 80%   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Change Parent] [Remove Parent]                 │
└─────────────────────────────────────────────────┘
```

---

## Responsive Design Considerations

**Mobile view:**
- Collapse tree by default
- "Expand All" / "Collapse All" buttons
- Swipe gestures for expand/collapse

**Desktop view:**
- Show 2-3 levels by default
- Keyboard navigation (arrow keys)
- Breadcrumb navigation

---

## Accessibility

**WCAG 2.1 AA compliance:**
- ✅ Keyboard navigation (Tab, Enter, Arrow keys)
- ✅ Screen reader support (aria-expanded, aria-label)
- ✅ Sufficient color contrast (icons + text)
- ✅ Focus indicators

**Implementation:**
```typescript
<button
  onClick={() => toggleExpanded(item.id)}
  aria-expanded={item.expanded}
  aria-label={`${item.expanded ? 'Collapse' : 'Expand'} ${item.name}`}
>
  {item.expanded ? <ChevronDown /> : <ChevronRight />}
</button>
```

---

## MANDATORY IMPLEMENTATION CHECKLIST

**Features Page:**
- [ ] Create tree structure from flat feature list
- [ ] Implement expand/collapse functionality
- [ ] Add type icons (epic, story, task)
- [ ] Add children count badges
- [ ] Show "Export" button only for epics
- [ ] Add indentation based on depth
- [ ] Test with nested features (3 levels)

**Feature Detail Page:**
- [ ] Add hierarchy section
- [ ] Show parent (if exists)
- [ ] Show children (if exists)
- [ ] Show breadcrumb path
- [ ] Add "Set Parent" button
- [ ] Add "Remove Parent" button
- [ ] Implement set parent dialog

**API Endpoints:**
- [ ] Create `GET /api/features/:id/hierarchy`
- [ ] Create `PUT /api/features/:id/parent`
- [ ] Create `DELETE /api/features/:id/parent`
- [ ] Add `type` query param to `GET /api/features`
- [ ] Add `parent` query param to `GET /api/features`

**Jira Wizard:**
- [ ] Filter to epic-type features only
- [ ] Filter to root features (parent_id=NULL)
- [ ] Update loading message

**Verification:**
- [ ] Tree view renders correctly
- [ ] Can expand/collapse nodes
- [ ] Export button only on epics
- [ ] Feature detail shows parent/children
- [ ] Can set parent manually
- [ ] Can remove parent
- [ ] Jira wizard only shows root epics

**If ANY fails, you have FAILED.**

---

## File Size: ~390 lines ✅
**Next**: Read `06_TESTING_AND_VALIDATION.md`
