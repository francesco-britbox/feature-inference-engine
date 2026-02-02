# Phase 7.7: Jira Generation Wizard with Folder Structure Export
**Duration**: 2-3 days (12-18 hours)
**Dependencies**: Phase 7.6 complete
**Type**: Major Feature - Dedicated Jira Ticket Generation System

---

## Overview

Replace the incorrectly implemented "Quick Export" feature with a comprehensive Jira Generation Wizard that:
1. Presents a dedicated page for platform selection
2. Shows hierarchical tree of epics → stories → subtasks with checkboxes
3. Generates server-side folder structure with markdown files
4. Includes reference folders with evidence for each story/subtask
5. Zips everything and provides download
6. Allows clearing server-side temp files

---

## Phase Structure

```
Phase 7.7
├── 7.7.0: Cleanup Incorrect Implementation (1 hour)
├── 7.7.1: Navigation Improvements (1 hour)
├── 7.7.2: Jira Wizard UI - Platform Selection (2 hours)
├── 7.7.3: Jira Wizard UI - Tree Selection (3 hours)
├── 7.7.4: Server-Side Folder Generator (4 hours)
├── 7.7.5: Zip & Download (2 hours)
└── 7.7.6: Cleanup & Testing (1-2 hours)
```

**Total**: 14-16 hours (2-3 days)

---

## 7.7.0: Cleanup Incorrect Implementation

**Goal**: Remove incorrectly added Quick Export feature from home page

### Files to Modify

#### 1. Remove QuickExportSection Component
- [ ] **DELETE**: `components/QuickExportSection.tsx` (entire file)
  - Reason: Wrong approach - export should be on dedicated page, not home

#### 2. Revert app/page.tsx Changes
- [ ] **REMOVE** these imports (lines 18-20):
  ```typescript
  // REMOVE:
  import { FileJson, File, Smartphone } from 'lucide-react';
  import { QuickExportSection } from '@/components/QuickExportSection';
  import type { Feature } from '@/lib/types/feature';
  ```

- [ ] **REMOVE** topFeatures state (line 69):
  ```typescript
  // REMOVE:
  const [topFeatures, setTopFeatures] = useState<Feature[]>([]);
  ```

- [ ] **REMOVE** fetchTopFeatures from useEffect (line 74):
  ```typescript
  // REMOVE:
  useEffect(() => {
    fetchStats();
    checkHealth();
    fetchTopFeatures(); // ← REMOVE THIS LINE
  }, []);
  ```

- [ ] **REMOVE** fetchTopFeatures function (lines 116-132):
  ```typescript
  // REMOVE ENTIRE FUNCTION:
  const fetchTopFeatures = async () => {
    try {
      const response = await fetch('/api/features?status=confirmed&limit=3');
      if (!response.ok) return;
      const data: Feature[] = await response.json();
      setTopFeatures(data);
    } catch {
      // Silent fail - UI will not show Quick Export section
    }
  };
  ```

- [ ] **REMOVE** Quick Export section (lines 441-534):
  ```tsx
  {/* Quick Export */}
  <QuickExportSection features={topFeatures} />
  ```

#### 3. Keep app/features/page.tsx Export Button
- [ ] **KEEP**: Export button added to features list (this is correct)
- [ ] Verify it links to `/features/[id]/export` (correct behavior)

#### 4. Keep lib/types/feature.ts
- [ ] **KEEP**: Shared Feature type (this is good - DRY principle)
- [ ] Will be used by Jira wizard

#### 5. Keep lib/types/platform.ts Changes
- [ ] **KEEP**: `isPlatform()` type guard (correct, useful)

### Verification After Cleanup
- [ ] Run: `pnpm typecheck` (must pass)
- [ ] Run: `pnpm lint` (must pass)
- [ ] Run: `pnpm build` (must pass)
- [ ] Test home page loads without Quick Export section
- [ ] Commit: "chore: Remove incorrect Quick Export from home page"

---

## 7.7.1: Navigation Improvements on Home Page

**Goal**: Add clear navigation links to all app sections

### Current Navigation (Fact-Checked)

**Home page has**:
- ✅ Quick Actions: Upload, Run Inference, View Features (3 cards)
- ✅ Explore Grid: Evidence, Features, Status, Correlation (4 cards)

**Missing links**:
- ❌ Documents management (/documents)
- ❌ Settings (/settings)
- ❌ **Jira Generation** (/jira) ← NEW PAGE

### Implementation

#### Update app/page.tsx Navigation Cards

**Add to navigationCards array** (after line 159):

```typescript
const navigationCards = [
  {
    icon: FileText,
    title: 'Evidence',
    description: 'View extracted evidence from documents',
    href: '/evidence',
    stats: `${stats.evidence} items`,
    color: 'text-orange-600',
  },
  {
    icon: Brain,
    title: 'Features',
    description: 'Manage feature candidates and exports',
    href: '/features',
    stats: `${stats.features} inferred`,
    color: 'text-green-600',
  },
  // ADD THIS:
  {
    icon: Package, // NEW ICON
    title: 'Jira Generation',
    description: 'Generate epics, stories, and subtasks',
    href: '/jira',
    stats: 'Wizard',
    color: 'text-blue-600',
  },
  // ADD THIS:
  {
    icon: FileStack, // NEW ICON
    title: 'Documents',
    description: 'Manage uploaded documents',
    href: '/documents',
    stats: `${stats.documents} files`,
    color: 'text-purple-600',
  },
  {
    icon: Activity,
    title: 'Status',
    description: 'Monitor processing status and jobs',
    href: '/status',
    stats: systemHealthy ? 'Healthy' : 'Checking...',
    color: 'text-blue-600',
  },
  {
    icon: Settings, // NEW ICON
    title: 'Settings',
    description: 'System configuration and danger zone',
    href: '/settings',
    stats: 'Admin',
    color: 'text-gray-600',
  },
  {
    icon: Layers,
    title: 'Correlation',
    description: 'Debug feature-evidence relationships',
    href: '/debug/correlation',
    stats: 'Debug tools',
    color: 'text-purple-600',
  },
];
```

**Update imports**:
```typescript
import {
  // ... existing
  Package, // NEW
  FileStack, // NEW
  Settings, // NEW
} from 'lucide-react';
```

**Result**: Home page will have 7 navigation cards in grid layout

---

## 7.7.2: Jira Wizard Page - Platform Selection (Step 1)

**Goal**: Create dedicated page for Jira generation starting with platform selection

### File: `app/jira/page.tsx` (NEW)

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type PlatformSelection = 'ios' | 'android' | 'mobile' | 'web';

const PLATFORM_INFO = {
  ios: {
    name: 'iOS',
    description: 'Generate tickets for iOS app (Swift, UIKit, SwiftUI)',
    icon: '📱',
    tags: ['ios'],
  },
  android: {
    name: 'Android',
    description: 'Generate tickets for Android app (Kotlin, Jetpack Compose)',
    icon: '🤖',
    tags: ['android'],
  },
  mobile: {
    name: 'Mobile (iOS + Android)',
    description: 'Generate tickets tagged for both iOS and Android platforms',
    icon: '📱🤖',
    tags: ['ios', 'android'],
  },
  web: {
    name: 'Web',
    description: 'Generate tickets for web app (React, Next.js, HTML5)',
    icon: '🌐',
    tags: ['web'],
  },
};

export default function JiraWizardPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformSelection | null>(null);

  const handlePlatformSelect = (platform: PlatformSelection) => {
    setSelectedPlatform(platform);
  };

  const handleNext = () => {
    if (step === 1 && selectedPlatform) {
      setStep(2);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Jira Generation Wizard</h1>
        <p className="text-muted-foreground mt-2">
          Generate platform-specific epics, stories, and subtasks for Jira import
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="text-sm font-medium">Platform</span>
        </div>
        <div className="h-0.5 w-12 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="text-sm font-medium">Select</span>
        </div>
        <div className="h-0.5 w-12 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="text-sm font-medium">Generate</span>
        </div>
      </div>

      {/* Step 1: Platform Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Step 1: Select Target Platform
              </CardTitle>
              <CardDescription>
                Choose the platform for which you want to generate Jira tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedPlatform === key
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border-2 border-transparent hover:border-border'
                    }`}
                    onClick={() => handlePlatformSelect(key as PlatformSelection)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{info.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{info.name}</h3>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                          <div className="flex gap-1 mt-2">
                            {info.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {selectedPlatform === key && (
                          <div className="text-primary">
                            <Check className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleNext} disabled={!selectedPlatform} size="lg">
              Next: Select Epics & Stories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Will be implemented in 7.7.3 */}
      {/* Step 3: Will be implemented in 7.7.5 */}
    </div>
  );
}
```

---

## 7.7.3: Jira Wizard - Epic/Story/Subtask Tree Selection (Step 2)

**Goal**: Show hierarchical tree with checkboxes for selection

### Component: `components/JiraTreeSelector.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  description: string;
  timeEstimate: string;
  selected: boolean;
}

interface Story {
  id: string;
  title: string;
  description: string;
  storyPoints: number;
  subtasks: Subtask[];
  selected: boolean;
  expanded: boolean;
}

interface Epic {
  id: string; // This is featureId
  name: string;
  description: string;
  confidence: number;
  stories: Story[];
  selected: boolean;
  expanded: boolean;
}

interface JiraTreeSelectorProps {
  platform: 'ios' | 'android' | 'mobile' | 'web';
  onSelectionChange: (selectedItems: {
    epics: string[];
    stories: string[];
    subtasks: string[];
  }) => void;
}

export function JiraTreeSelector({ platform, onSelectionChange }: JiraTreeSelectorProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpicsWithStoriesAndSubtasks();
  }, [platform]);

  const fetchEpicsWithStoriesAndSubtasks = async () => {
    setLoading(true);
    try {
      // Fetch all features
      const featuresResponse = await fetch('/api/features');
      const features = await featuresResponse.json();

      // For each feature, generate stories and subtasks
      const epicsData: Epic[] = await Promise.all(
        features.map(async (feature: any) => {
          try {
            // Generate epic with platform parameter
            const epicResponse = await fetch(
              `/api/features/${feature.id}/export?format=json&platform=${platform}`
            );

            if (!epicResponse.ok) {
              return null;
            }

            const epicData = await epicResponse.json();
            const epicIssue = epicData.projects[0]?.issues[0];
            const storyIssues = epicData.projects[0]?.issues.slice(1) || [];

            return {
              id: feature.id,
              name: feature.name,
              description: feature.description || '',
              confidence: parseFloat(feature.confidenceScore || '0'),
              stories: storyIssues.map((story: any, storyIndex: number) => ({
                id: `${feature.id}-story-${storyIndex}`,
                title: story.summary,
                description: story.description,
                storyPoints: story.storyPoints || 0,
                subtasks: (story.subtasks || []).map((subtask: any, subtaskIndex: number) => ({
                  id: `${feature.id}-story-${storyIndex}-subtask-${subtaskIndex}`,
                  title: subtask.title,
                  description: subtask.description,
                  timeEstimate: subtask.timeEstimate,
                  selected: true, // Default: all selected
                })),
                selected: true,
                expanded: false,
              })),
              selected: true, // Default: all epics selected
              expanded: false,
            };
          } catch (error) {
            console.error(`Failed to generate epic for feature ${feature.id}:`, error);
            return null;
          }
        })
      );

      setEpics(epicsData.filter((e): e is Epic => e !== null));
    } catch (error) {
      console.error('Failed to fetch epics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEpic = (epicId: string) => {
    setEpics((prev) =>
      prev.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              selected: !epic.selected,
              stories: epic.stories.map((s) => ({
                ...s,
                selected: !epic.selected,
                subtasks: s.subtasks.map((st) => ({ ...st, selected: !epic.selected })),
              })),
            }
          : epic
      )
    );
  };

  const toggleStory = (epicId: string, storyId: string) => {
    setEpics((prev) =>
      prev.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              stories: epic.stories.map((story) =>
                story.id === storyId
                  ? {
                      ...story,
                      selected: !story.selected,
                      subtasks: story.subtasks.map((st) => ({
                        ...st,
                        selected: !story.selected,
                      })),
                    }
                  : story
              ),
            }
          : epic
      )
    );
  };

  const toggleSubtask = (epicId: string, storyId: string, subtaskId: string) => {
    setEpics((prev) =>
      prev.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              stories: epic.stories.map((story) =>
                story.id === storyId
                  ? {
                      ...story,
                      subtasks: story.subtasks.map((subtask) =>
                        subtask.id === subtaskId
                          ? { ...subtask, selected: !subtask.selected }
                          : subtask
                      ),
                    }
                  : story
              ),
            }
          : epic
      )
    );
  };

  const toggleExpanded = (epicId: string, storyId?: string) => {
    if (storyId) {
      // Toggle story expansion
      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId
            ? {
                ...epic,
                stories: epic.stories.map((story) =>
                  story.id === storyId ? { ...story, expanded: !story.expanded } : story
                ),
              }
            : epic
        )
      );
    } else {
      // Toggle epic expansion
      setEpics((prev) =>
        prev.map((epic) =>
          epic.id === epicId ? { ...epic, expanded: !epic.expanded } : epic
        )
      );
    }
  };

  useEffect(() => {
    // Notify parent of selection changes
    const selectedEpics = epics.filter((e) => e.selected).map((e) => e.id);
    const selectedStories = epics.flatMap((e) =>
      e.stories.filter((s) => s.selected).map((s) => s.id)
    );
    const selectedSubtasks = epics.flatMap((e) =>
      e.stories.flatMap((s) =>
        s.subtasks.filter((st) => st.selected).map((st) => st.id)
      )
    );

    onSelectionChange({
      epics: selectedEpics,
      stories: selectedStories,
      subtasks: selectedSubtasks,
    });
  }, [epics, onSelectionChange]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">
          Generating epics, stories, and subtasks for {platform}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {epics.map((epic) => (
        <Card key={epic.id} className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={epic.selected}
                onCheckedChange={() => toggleEpic(epic.id)}
              />
              <button
                onClick={() => toggleExpanded(epic.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {epic.expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div className="flex-1">
                  <CardTitle className="text-lg">{epic.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default">Epic</Badge>
                    <Badge variant="outline">{(epic.confidence * 100).toFixed(0)}% confidence</Badge>
                    <Badge variant="secondary">{epic.stories.length} stories</Badge>
                  </div>
                </div>
              </button>
            </div>
          </CardHeader>

          {epic.expanded && (
            <CardContent className="pl-12 space-y-3">
              {epic.stories.map((story) => (
                <div key={story.id} className="border-l-2 border-primary/20 pl-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={story.selected}
                      onCheckedChange={() => toggleStory(epic.id, story.id)}
                    />
                    <button
                      onClick={() => toggleExpanded(epic.id, story.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {story.expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{story.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Story
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {story.storyPoints} pts
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {story.subtasks.length} subtasks
                          </Badge>
                        </div>
                      </div>
                    </button>
                  </div>

                  {story.expanded && story.subtasks.length > 0 && (
                    <div className="pl-8 space-y-2">
                      {story.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-start gap-3">
                          <Checkbox
                            checked={subtask.selected}
                            onCheckedChange={() =>
                              toggleSubtask(epic.id, story.id, subtask.id)
                            }
                          />
                          <div className="flex-1">
                            <p className="text-sm">{subtask.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Subtask
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {subtask.timeEstimate}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
```

---

## 7.7.4: Server-Side Folder Structure Generator

**Goal**: Generate folder structure on server with markdown files and evidence references

### Service: `lib/services/JiraFolderGeneratorService.ts` (NEW)

```typescript
/**
 * Jira Folder Generator Service
 * Single Responsibility: Generate folder structure for Jira tickets
 */

import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db/client';
import { features, evidence, featureEvidence } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { Platform } from '@/lib/types/platform';
import type { JiraEpic, JiraStory, JiraSubtask } from '@/lib/types/ticket';
import { TicketService } from './TicketService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'JiraFolderGenerator' });

/**
 * Selection request from UI
 */
export interface JiraGenerationRequest {
  platform: 'ios' | 'android' | 'mobile' | 'web';
  selectedEpics: string[]; // Feature IDs
  selectedStories: string[]; // Story IDs (format: featureId-story-index)
  selectedSubtasks: string[]; // Subtask IDs (format: featureId-story-index-subtask-index)
}

/**
 * Generation progress callback
 */
export type ProgressCallback = (progress: number, message: string) => void;

/**
 * Jira Folder Generator Service
 * Generates folder structure: platform/epic/story/subtask with markdown files
 */
export class JiraFolderGeneratorService {
  private readonly TEMP_BASE_PATH = path.join(process.cwd(), 'temp', 'jira');
  private readonly ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  /**
   * Generate folder structure for selected items
   * Returns path to generated folder (for zipping)
   */
  async generateFolderStructure(
    request: JiraGenerationRequest,
    onProgress?: ProgressCallback
  ): Promise<string> {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const outputPath = path.join(this.TEMP_BASE_PATH, sessionId);

    logger.info({ request, sessionId }, 'Starting Jira folder generation');

    try {
      // Create base directory
      await fs.mkdir(outputPath, { recursive: true });

      onProgress?.(5, 'Created base directory...');

      // Determine platform folder name
      const platformFolder = request.platform;
      const platformPath = path.join(outputPath, platformFolder);
      await fs.mkdir(platformPath, { recursive: true });

      onProgress?.(10, `Created platform folder: ${platformFolder}`);

      // Process each selected epic
      const totalEpics = request.selectedEpics.length;
      let processedEpics = 0;

      for (const featureId of request.selectedEpics) {
        try {
          await this.generateEpicFolder(
            featureId,
            platformPath,
            request,
            (epicProgress, msg) => {
              const overallProgress = 10 + (processedEpics / totalEpics) * 70 + (epicProgress / totalEpics) * 0.7;
              onProgress?.(Math.round(overallProgress), msg);
            }
          );

          processedEpics++;
        } catch (error) {
          logger.error({ featureId, error }, 'Failed to generate epic folder');
          // Continue with other epics
        }
      }

      onProgress?.(85, 'All epics generated');

      // Create README.md at root
      await this.createRootReadme(outputPath, request);

      onProgress?.(95, 'Created README.md');

      logger.info({ sessionId, outputPath }, 'Jira folder generation complete');

      return outputPath;
    } catch (error) {
      logger.error({ request, error }, 'Folder generation failed');
      throw error;
    }
  }

  /**
   * Generate folder for a single epic
   */
  private async generateEpicFolder(
    featureId: string,
    platformPath: string,
    request: JiraGenerationRequest,
    onProgress: ProgressCallback
  ): Promise<void> {
    // Get feature
    const [feature] = await db.select().from(features).where(eq(features.id, featureId));

    if (!feature) {
      throw new Error(`Feature ${featureId} not found`);
    }

    onProgress(0, `Generating epic: ${feature.name}...`);

    // Generate epic with stories and subtasks
    const platformForApi = request.platform === 'mobile' ? 'ios' : request.platform;
    const epic = await this.ticketService.generateEpic(featureId, platformForApi);

    // Create epic folder (sanitized name)
    const epicFolderName = this.sanitizeFolderName(feature.name);
    const epicPath = path.join(platformPath, epicFolderName);
    await fs.mkdir(epicPath, { recursive: true });

    onProgress(10, `Created epic folder: ${epicFolderName}`);

    // Create epic.md
    await this.createEpicMarkdown(epicPath, epic, request.platform);

    onProgress(20, 'Created epic.md');

    // Get evidence for this feature
    const featureEvidenceLinks = await db
      .select({
        evidenceId: featureEvidence.evidenceId,
        relationshipType: featureEvidence.relationshipType,
        strength: featureEvidence.strength,
      })
      .from(featureEvidence)
      .where(eq(featureEvidence.featureId, featureId));

    const evidenceIds = featureEvidenceLinks.map((link) => link.evidenceId);
    const evidenceItems = await db
      .select()
      .from(evidence)
      .where(inArray(evidence.id, evidenceIds));

    onProgress(30, 'Fetched evidence for epic');

    // Process stories
    const totalStories = epic.stories.length;
    let processedStories = 0;

    for (let storyIndex = 0; storyIndex < epic.stories.length; storyIndex++) {
      const story = epic.stories[storyIndex]!;
      const storyId = `${featureId}-story-${storyIndex}`;

      // Check if this story is selected
      if (!request.selectedStories.includes(storyId)) {
        processedStories++;
        continue;
      }

      try {
        await this.generateStoryFolder(
          epicPath,
          story,
          storyId,
          storyIndex,
          evidenceItems,
          request
        );

        processedStories++;
        const storyProgress = 30 + (processedStories / totalStories) * 60;
        onProgress(storyProgress, `Generated story ${processedStories}/${totalStories}`);
      } catch (error) {
        logger.error({ storyId, error }, 'Failed to generate story folder');
        // Continue with other stories
      }
    }

    onProgress(100, `Epic complete: ${feature.name}`);
  }

  /**
   * Generate folder for a single story
   */
  private async generateStoryFolder(
    epicPath: string,
    story: JiraStory,
    storyId: string,
    storyIndex: number,
    evidenceItems: any[],
    request: JiraGenerationRequest
  ): Promise<void> {
    // Create story folder
    const storyFolderName = this.sanitizeFolderName(story.title);
    const storyPath = path.join(epicPath, storyFolderName);
    await fs.mkdir(storyPath, { recursive: true });

    // Create story.md
    await this.createStoryMarkdown(storyPath, story);

    // Create references folder for story
    const storyReferencesPath = path.join(storyPath, 'references');
    await fs.mkdir(storyReferencesPath, { recursive: true });

    // Export evidence for this story (filtered by evidenceIds)
    const storyEvidence = evidenceItems.filter((ev) =>
      story.evidenceIds.includes(ev.id)
    );

    for (const ev of storyEvidence) {
      const evidenceFileName = `evidence-${ev.id.substring(0, 8)}.json`;
      const evidenceFilePath = path.join(storyReferencesPath, evidenceFileName);
      await fs.writeFile(
        evidenceFilePath,
        JSON.stringify(
          {
            id: ev.id,
            type: ev.type,
            content: ev.content,
            rawData: ev.rawData,
            extractedAt: ev.extractedAt,
          },
          null,
          2
        )
      );
    }

    // Process subtasks
    if (story.subtasks) {
      for (let subtaskIndex = 0; subtaskIndex < story.subtasks.length; subtaskIndex++) {
        const subtask = story.subtasks[subtaskIndex]!;
        const subtaskId = `${storyId}-subtask-${subtaskIndex}`;

        // Check if this subtask is selected
        if (!request.selectedSubtasks.includes(subtaskId)) {
          continue;
        }

        await this.generateSubtaskFolder(
          storyPath,
          subtask,
          subtaskIndex,
          evidenceItems.slice(0, 2) // Sample evidence for subtask
        );
      }
    }
  }

  /**
   * Generate folder for a single subtask
   */
  private async generateSubtaskFolder(
    storyPath: string,
    subtask: JiraSubtask,
    subtaskIndex: number,
    evidenceItems: any[]
  ): Promise<void> {
    // Create subtask folder
    const subtaskFolderName = this.sanitizeFolderName(subtask.title);
    const subtaskPath = path.join(storyPath, subtaskFolderName);
    await fs.mkdir(subtaskPath, { recursive: true });

    // Create subtask.md
    await this.createSubtaskMarkdown(subtaskPath, subtask);

    // Create references folder for subtask
    const subtaskReferencesPath = path.join(subtaskPath, 'references');
    await fs.mkdir(subtaskReferencesPath, { recursive: true });

    // Export relevant evidence for this subtask
    for (const ev of evidenceItems) {
      const evidenceFileName = `evidence-${ev.id.substring(0, 8)}.json`;
      const evidenceFilePath = path.join(subtaskReferencesPath, evidenceFileName);
      await fs.writeFile(
        evidenceFilePath,
        JSON.stringify(
          {
            id: ev.id,
            type: ev.type,
            content: ev.content,
            extractedAt: ev.extractedAt,
          },
          null,
          2
        )
      );
    }
  }

  /**
   * Create epic.md file
   */
  private async createEpicMarkdown(
    epicPath: string,
    epic: JiraEpic,
    platform: string
  ): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Epic: ${epic.title}`);
    lines.push('');
    lines.push(`**Platform**: ${platform.toUpperCase()}`);
    lines.push(`**Priority**: ${epic.priority || 'Medium'}`);
    if (epic.labels && epic.labels.length > 0) {
      lines.push(`**Labels**: ${epic.labels.join(', ')}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(epic.description);
    lines.push('');

    if (epic.acceptanceCriteria.scenarios.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const scenario of epic.acceptanceCriteria.scenarios) {
        lines.push('### Scenario');
        lines.push(`- **Given**: ${scenario.given}`);
        lines.push(`- **When**: ${scenario.when}`);
        lines.push(`- **Then**: ${scenario.then}`);
        lines.push('');
      }
    }

    lines.push('## Stories');
    lines.push('');
    lines.push(`This epic contains ${epic.stories.length} user stories.`);
    lines.push('See individual story folders for details.');
    lines.push('');

    await fs.writeFile(path.join(epicPath, 'epic.md'), lines.join('\n'));
  }

  /**
   * Create story.md file
   */
  private async createStoryMarkdown(storyPath: string, story: JiraStory): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Story: ${story.title}`);
    lines.push('');
    lines.push(`**Priority**: ${story.priority || 'Medium'}`);
    lines.push(`**Story Points**: ${story.storyPoints || 'Not estimated'}`);
    if (story.labels && story.labels.length > 0) {
      lines.push(`**Labels**: ${story.labels.join(', ')}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(story.description);
    lines.push('');

    if (story.acceptanceCriteria.length > 0) {
      lines.push('## Acceptance Criteria');
      lines.push('');
      for (const criterion of story.acceptanceCriteria) {
        lines.push(`- ${criterion}`);
      }
      lines.push('');
    }

    if (story.subtasks && story.subtasks.length > 0) {
      lines.push('## Subtasks');
      lines.push('');
      lines.push(`This story has ${story.subtasks.length} subtasks.`);
      lines.push('See individual subtask folders for details.');
      lines.push('');
    }

    lines.push('## Evidence References');
    lines.push('');
    lines.push('See `references/` folder for evidence JSON files.');
    lines.push('');

    await fs.writeFile(path.join(storyPath, 'story.md'), lines.join('\n'));
  }

  /**
   * Create subtask.md file
   */
  private async createSubtaskMarkdown(
    subtaskPath: string,
    subtask: JiraSubtask
  ): Promise<void> {
    const lines: string[] = [];

    lines.push(`# Subtask: ${subtask.title}`);
    lines.push('');
    lines.push(`**Time Estimate**: ${subtask.timeEstimate}`);
    if (subtask.assignee) {
      lines.push(`**Assignee**: ${subtask.assignee}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(subtask.description);
    lines.push('');
    lines.push('## Evidence References');
    lines.push('');
    lines.push('See `references/` folder for evidence JSON files.');
    lines.push('');

    await fs.writeFile(path.join(subtaskPath, 'subtask.md'), lines.join('\n'));
  }

  /**
   * Create root README.md
   */
  private async createRootReadme(
    outputPath: string,
    request: JiraGenerationRequest
  ): Promise<void> {
    const lines: string[] = [];

    lines.push('# Jira Tickets Export');
    lines.push('');
    lines.push(`**Platform**: ${request.platform.toUpperCase()}`);
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push(`**Epics**: ${request.selectedEpics.length}`);
    lines.push(`**Stories**: ${request.selectedStories.length}`);
    lines.push(`**Subtasks**: ${request.selectedSubtasks.length}`);
    lines.push('');
    lines.push('## Structure');
    lines.push('');
    lines.push('```');
    lines.push(`${request.platform}/`);
    lines.push('  epic-name/`);
    lines.push('    epic.md');
    lines.push('    story-name/');
    lines.push('      story.md');
    lines.push('      references/');
    lines.push('        evidence-xxx.json');
    lines.push('      subtask-name/');
    lines.push('        subtask.md');
    lines.push('        references/');
    lines.push('          evidence-yyy.json');
    lines.push('```');
    lines.push('');
    lines.push('## Import to Jira');
    lines.push('');
    lines.push('1. Review epic.md files');
    lines.push('2. Create epics in Jira manually or via CSV import');
    lines.push('3. Create stories under epics');
    lines.push('4. Create subtasks under stories');
    lines.push('5. Attach evidence files as needed');
    lines.push('');

    await fs.writeFile(path.join(outputPath, 'README.md'), lines.join('\n'));
  }

  /**
   * Sanitize folder name (remove special characters)
   */
  private sanitizeFolderName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50); // Max 50 chars
  }

  /**
   * Get list of all generated folders (for cleanup UI)
   */
  async listGeneratedFolders(): Promise<
    Array<{ sessionId: string; createdAt: Date; size: string }>
  > {
    try {
      const entries = await fs.readdir(this.TEMP_BASE_PATH);
      const folders = [];

      for (const entry of entries) {
        const entryPath = path.join(this.TEMP_BASE_PATH, entry);
        const stats = await fs.stat(entryPath);

        if (stats.isDirectory()) {
          folders.push({
            sessionId: entry,
            createdAt: stats.birthtime,
            size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          });
        }
      }

      return folders;
    } catch {
      return [];
    }
  }

  /**
   * Clear all generated folders
   */
  async clearAllFolders(): Promise<number> {
    try {
      await fs.rm(this.TEMP_BASE_PATH, { recursive: true, force: true });
      await fs.mkdir(this.TEMP_BASE_PATH, { recursive: true });
      logger.info('All Jira temp folders cleared');
      return 1;
    } catch (error) {
      logger.error({ error }, 'Failed to clear Jira folders');
      throw error;
    }
  }

  /**
   * Clear specific folder by session ID
   */
  async clearFolder(sessionId: string): Promise<void> {
    const folderPath = path.join(this.TEMP_BASE_PATH, sessionId);
    await fs.rm(folderPath, { recursive: true, force: true });
    logger.info({ sessionId }, 'Jira folder cleared');
  }
}

/**
 * Singleton instance
 */
export const jiraFolderGeneratorService = new JiraFolderGeneratorService();
```

---

## 7.7.5: Zip Generation & Download

### API Endpoints (3 NEW)

#### File 1: `app/api/jira/generate/route.ts` (NEW)

```typescript
/**
 * Jira Generation API
 * POST /api/jira/generate - Generate folder structure
 */

import { NextRequest, NextResponse } from 'next/server';
import { jiraFolderGeneratorService } from '@/lib/services/JiraFolderGeneratorService';
import type { JiraGenerationRequest } from '@/lib/services/JiraFolderGeneratorService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'JiraGenerateAPI' });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: JiraGenerationRequest = await request.json();

    logger.info({ request: body }, 'Jira generation requested');

    // Generate folder structure
    const outputPath = await jiraFolderGeneratorService.generateFolderStructure(body);

    // Extract session ID from path
    const sessionId = outputPath.split('/').pop();

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Folder structure generated successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Jira generation failed');

    return NextResponse.json(
      {
        error: 'Generation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

#### File 2: `app/api/jira/download/[sessionId]/route.ts` (NEW)

```typescript
/**
 * Jira Download API
 * GET /api/jira/download/:sessionId - Download zip file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import archiver from 'archiver';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ service: 'JiraDownloadAPI' });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  const { sessionId } = await params;

  logger.info({ sessionId }, 'Jira download requested');

  try {
    const sourcePath = path.join(process.cwd(), 'temp', 'jira', sessionId);
    const zipPath = path.join(process.cwd(), 'temp', `${sessionId}.zip`);

    // Verify folder exists
    try {
      await fs.access(sourcePath);
    } catch {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    // Create zip file
    await this.zipFolder(sourcePath, zipPath);

    logger.info({ sessionId, zipPath }, 'Zip file created');

    // Read zip file
    const zipBuffer = await fs.readFile(zipPath);

    // Clean up zip file after reading
    await fs.rm(zipPath, { force: true });

    // Return zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="jira-tickets-${sessionId}.zip"`,
      },
    });
  } catch (error) {
    logger.error({ sessionId, error }, 'Download failed');

    return NextResponse.json(
      {
        error: 'Download failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }

  private async zipFolder(sourceFolder: string, outputZip: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputZip);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceFolder, false);
      archive.finalize();
    });
  }
}
```

#### File 3: `app/api/jira/clear/route.ts` (NEW)

```typescript
/**
 * Jira Cleanup API
 * POST /api/jira/clear - Clear all generated folders
 */

import { NextResponse } from 'next/server';
import { jiraFolderGeneratorService } from '@/lib/services/JiraFolderGeneratorService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'JiraClearAPI' });

export async function POST(): Promise<NextResponse> {
  logger.info('Clearing all Jira temp folders');

  try {
    const count = await jiraFolderGeneratorService.clearAllFolders();

    return NextResponse.json({
      success: true,
      message: `Cleared ${count} folder(s)`,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to clear Jira folders');

    return NextResponse.json(
      {
        error: 'Clear failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
```

---

## 7.7.6: Complete Jira Wizard UI (Step 2 & 3)

### Update: `app/jira/page.tsx` (Add Step 2 & 3)

**Step 2: Tree Selection with JiraTreeSelector component**

**Step 3: Progress & Download**
```tsx
{step === 3 && (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Generating Folder Structure...</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{progressMessage}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {progress === 100 && sessionId && (
          <div className="space-y-3">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertTitle>Generation Complete!</AlertTitle>
              <AlertDescription>
                Your Jira ticket structure is ready for download.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={handleDownload}
                size="lg"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download ZIP File
              </Button>

              <Button
                variant="outline"
                onClick={handleClearTemp}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Temp Files
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
)}
```

---

## Settings Page Simplification

### File: `app/settings/page.tsx` (MODIFY)

**KEEP**:
- ✅ System Information section
- ✅ Danger Zone section

**UPDATE Danger Zone**:
- Change confirmation text from "DELETE ALL DATA" to "Delete"
- Simpler, matches user request

```typescript
// Line ~210 in settings/page.tsx
<p className="text-sm font-medium mb-2">
  Type <code className="bg-red-100 px-2 py-1 rounded font-mono text-red-900 font-bold">Delete</code> to confirm:
</p>
<Input
  value={confirmText}
  onChange={(e) => setConfirmText(e.target.value)}
  placeholder="Type 'Delete'..."
  className="border-red-300 focus-visible:ring-red-500"
  disabled={deleting}
/>

// Line ~225
<Button
  variant="destructive"
  disabled={confirmText !== 'Delete' || deleting}
  onClick={handleDeleteAll}
  className="w-full"
>
```

**UPDATE API**: `app/api/system/reset/route.ts`
```typescript
// Line ~41
if (body.confirmation !== 'Delete') {
  logger.warn({ confirmation: body.confirmation }, 'Invalid confirmation text');
  throw new InvalidDataError(
    'Invalid confirmation text. Must be exactly: Delete',
    'confirmation'
  );
}
```

---

## Folder Structure Example (Final Output)

```
temp/jira/1738516800-abc123/  ← Session folder
  README.md  ← Root readme
  ios/  ← Platform folder
    user-authentication/  ← Epic folder
      epic.md  ← Epic details
      ios-ui-implementation/  ← Story folder
        story.md  ← Story details
        references/  ← Evidence for story
          evidence-a1b2c3d4.json
          evidence-e5f6g7h8.json
        create-uikit-login-controller/  ← Subtask folder
          subtask.md  ← Subtask details
          references/  ← Evidence for subtask
            evidence-a1b2c3d4.json
        add-faceid-integration/
          subtask.md
          references/
            evidence-i9j0k1l2.json
      backend-api-implementation/
        story.md
        references/
          evidence-m3n4o5p6.json
        create-auth-login-endpoint/
          subtask.md
          references/
            evidence-m3n4o5p6.json
    video-playback/
      epic.md
      avplayer-integration/
        story.md
        references/
        initialize-avplayerviewcontroller/
          subtask.md
          references/

  mobile/  ← If "mobile" selected
    user-authentication/
      epic.md  ← Tagged for BOTH ios and android
      ...
```

**Zipped as**: `jira-tickets-1738516800-abc123.zip` (downloaded to user)

---

## Implementation Order

### Part 1: Cleanup (1 hour)
1. Remove QuickExportSection.tsx
2. Revert app/page.tsx (remove Quick Export)
3. Test home page still works
4. Commit cleanup

### Part 2: Navigation (1 hour)
1. Add Package, FileStack, Settings icons
2. Add Jira, Documents, Settings to navigation cards
3. Update to 7-card grid
4. Commit navigation

### Part 3: Wizard Foundation (2 hours)
1. Create app/jira/page.tsx with Step 1 (platform selection)
2. Create platform selection UI (4 radio cards)
3. Next button enables when selected
4. Commit wizard foundation

### Part 4: Tree Selector (3 hours)
1. Create components/JiraTreeSelector.tsx
2. Fetch features + generate epics per feature
3. Build tree structure with checkboxes
4. Handle check/uncheck logic (epic → stories → subtasks)
5. Expand/collapse chevrons
6. Commit tree selector

### Part 5: Folder Generator (4 hours)
1. Create lib/services/JiraFolderGeneratorService.ts
2. Implement generateFolderStructure()
3. Create epic/story/subtask markdown files
4. Create references/ folders
5. Export evidence as JSON
6. Progress callbacks
7. Commit folder generator

### Part 6: Zip & Download (2 hours)
1. Install archiver package: `pnpm add archiver @types/archiver`
2. Create app/api/jira/generate/route.ts
3. Create app/api/jira/download/[sessionId]/route.ts
4. Create app/api/jira/clear/route.ts
5. Add Step 3 to wizard (progress bar + download)
6. Commit zip functionality

### Part 7: Settings Update (30 min)
1. Change "DELETE ALL DATA" to "Delete"
2. Update API validation
3. Test and commit

---

## File Changes Summary

### Files to DELETE (1 file)
```
components/QuickExportSection.tsx  (REMOVE ENTIRE FILE)
```

### Files to CREATE (7 files)
```
lib/services/JiraFolderGeneratorService.ts    (400 lines)
components/JiraTreeSelector.tsx               (300 lines)
app/jira/page.tsx                             (500 lines)
app/api/jira/generate/route.ts                (80 lines)
app/api/jira/download/[sessionId]/route.ts    (120 lines)
app/api/jira/clear/route.ts                   (50 lines)
lib/types/jira.ts                             (100 lines)
```

### Files to MODIFY (3 files)
```
app/page.tsx                           (-70 lines cleanup, +30 lines navigation)
app/settings/page.tsx                  (~10 lines - change confirmation text)
app/api/system/reset/route.ts          (~5 lines - change confirmation text)
```

**Total New Code**: ~1,550 lines
**Total Changes**: 3 files modified, 7 files created, 1 file deleted

---

## Dependencies to Add

```bash
# For zipping folders
pnpm add archiver
pnpm add -D @types/archiver
```

---

## Detailed Specifications

### Platform Selection Logic

**"mobile" platform means**:
- Generate tickets once
- Tag with BOTH "ios" and "android" labels
- Folder name: `mobile/`
- Epic/story descriptions mention "iOS and Android"

**Example**:
```markdown
# Epic: User Authentication
**Platform**: MOBILE (iOS + Android)
**Labels**: mobile, ios, android, authentication

## Description
This epic covers user authentication for both iOS and Android mobile platforms.
Implementation will use native code for each platform.
```

### Evidence Assignment Logic

**Which evidence goes to which story?**
- Story has `evidenceIds` array (from TicketService)
- Filter `evidenceItems` by `story.evidenceIds.includes(ev.id)`
- Export those specific evidence items to `story/references/`

**Which evidence goes to which subtask?**
- Subtasks don't have explicit evidence links (generated by LLM)
- **Strategy**: Split story's evidence among subtasks
  - If story has 6 evidence items and 3 subtasks
  - Subtask 1: evidence items 0-1
  - Subtask 2: evidence items 2-3
  - Subtask 3: evidence items 4-5
- **Alternative**: Duplicate all story evidence to all subtasks (simpler)

**Recommended**: Duplicate story evidence to all subtasks (every subtask gets same references)

### Progress Reporting

**Use Server-Sent Events (SSE) or Polling**:

**Option A: Polling** (Simpler)
```typescript
// Client: app/jira/page.tsx
const pollProgress = async () => {
  const response = await fetch(`/api/jira/progress/${sessionId}`);
  const data = await response.json();
  setProgress(data.progress);
  setProgressMessage(data.message);

  if (data.progress < 100) {
    setTimeout(pollProgress, 500); // Poll every 500ms
  }
};
```

**Option B: In-Memory Progress** (Current approach)
- Store progress in JiraFolderGeneratorService
- Client polls GET /api/jira/progress/:sessionId
- Returns current progress

---

## Testing Plan

### Manual Tests

**Test 1: Full Jira Generation (iOS)**
1. [ ] Go to http://localhost:3003/jira
2. [ ] Select "iOS" platform
3. [ ] Click "Next"
4. [ ] See tree of 7 epics with stories and subtasks
5. [ ] All checkboxes checked by default
6. [ ] Uncheck 1 subtask
7. [ ] Click "Generate Structure"
8. [ ] See progress bar: 0% → 100%
9. [ ] Click "Download ZIP"
10. [ ] Verify zip downloads: `jira-tickets-xxxxx.zip`
11. [ ] Unzip and verify folder structure:
    - [ ] ios/ folder exists
    - [ ] 7 epic folders (one per feature)
    - [ ] Each epic has epic.md
    - [ ] Each epic has story folders
    - [ ] Each story has story.md + references/
    - [ ] Each story has subtask folders
    - [ ] Each subtask has subtask.md + references/
    - [ ] Evidence JSON files in references/
    - [ ] README.md at root
12. [ ] Click "Clear Temp Files"
13. [ ] Verify temp/ folder cleared

**Test 2: Mobile Platform**
1. [ ] Select "Mobile (iOS + Android)"
2. [ ] Generate structure
3. [ ] Verify mobile/ folder created
4. [ ] Verify epics have "ios, android" labels
5. [ ] Verify descriptions mention both platforms

**Test 3: Selective Generation**
1. [ ] Select "Web" platform
2. [ ] Uncheck 2 entire epics
3. [ ] Uncheck 3 specific subtasks
4. [ ] Generate
5. [ ] Verify only selected items in zip
6. [ ] Verify unchecked items NOT in folders

**Test 4: Settings Danger Zone**
1. [ ] Go to /settings
2. [ ] Type "Delete" (not "DELETE ALL DATA")
3. [ ] Button enables
4. [ ] Click → confirm
5. [ ] All data deleted
6. [ ] Redirect to home

---

## Success Criteria

### Jira Wizard
- ✅ Dedicated /jira page (not on home)
- ✅ Step 1: Platform selection (iOS, Android, Mobile, Web)
- ✅ Step 2: Tree with checkboxes (epic → story → subtask)
- ✅ Step 3: Progress bar (0-100%)
- ✅ Folder structure generated server-side
- ✅ Each story folder has story.md + references/
- ✅ Each subtask folder has subtask.md + references/
- ✅ Evidence exported as JSON in references/
- ✅ Zip download works
- ✅ Temp folder cleanup works

### Navigation
- ✅ Home page has links to ALL sections
- ✅ Jira Generation link prominent
- ✅ Documents, Settings visible

### Settings
- ✅ Confirmation text: "Delete" (simpler)
- ✅ Deletes all uploaded data
- ✅ Redirects to home

### Cleanup
- ✅ QuickExportSection removed
- ✅ Home page clean (no messy export UI)
- ✅ Export functionality in correct place (/jira wizard)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Zip generation fails on large datasets | Medium | High | Stream zip instead of buffering |
| Progress tracking complex | Medium | Medium | Use simple polling, not SSE |
| Folder structure too nested | Low | Low | Limit depth, sanitize names |
| Evidence assignment unclear | High | Medium | Duplicate story evidence to all subtasks |
| Mobile platform confusing | Medium | Low | Clear UI labels and descriptions |

---

## Code Quality Standards

All code must maintain **95%+ quality score**:
- ✅ TypeScript strict mode
- ✅ SOLID principles (SRP for services)
- ✅ DRY principle (no duplication)
- ✅ Error handling with structured errors
- ✅ Logging at appropriate levels
- ✅ Type safety (100% typed)
- ✅ Build successful
- ✅ Zero lint violations

---

## API Summary

### New Endpoints
```
POST   /api/jira/generate          - Generate folder structure
GET    /api/jira/download/:id      - Download zip file
POST   /api/jira/clear             - Clear temp folders
GET    /api/jira/progress/:id      - Get generation progress (optional)
```

### Updated Endpoints
```
POST   /api/system/reset           - Change confirmation to "Delete"
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "archiver": "^7.0.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.0"
  }
}
```

---

## Example markdown Files

### epic.md
```markdown
# Epic: User Authentication
**Platform**: IOS
**Priority**: High
**Labels**: ios, authentication

## Description
Users can register, log in, and log out of the application.

## Acceptance Criteria
### Scenario
- **Given**: User has valid credentials
- **When**: User enters email and password
- **Then**: User is authenticated and redirected to home

## Stories
This epic contains 2 user stories.
See individual story folders for details.
```

### story.md
```markdown
# Story: User Authentication - iOS UI Implementation
**Priority**: High
**Story Points**: 5
**Labels**: ios, ui, frontend

## Description
Implement user interface components for iOS login screen.

**Platform**: iOS
**Tech Stack**: Swift, UIKit, SwiftUI, StoreKit

## UI Elements
- Email input field
- Password input field
- Submit button

## Acceptance Criteria
- UI element present: Email input field
- UI element present: Password input field
- UI element present: Submit button

## Subtasks
This story has 3 subtasks.
See individual subtask folders for details.

## Evidence References
See `references/` folder for evidence JSON files.
```

### subtask.md
```markdown
# Subtask: Create UIKit login view controller
**Time Estimate**: 4h

## Description
Set up UIViewController subclass with outlets for email/password fields and login button.
Configure view hierarchy and constraints.

## Evidence References
See `references/` folder for evidence JSON files related to this subtask.
```

### references/evidence-a1b2c3d4.json
```json
{
  "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "type": "ui_element",
  "content": "Email input field with placeholder 'Enter your email'",
  "rawData": {
    "x": 50,
    "y": 200,
    "width": 300,
    "height": 40
  },
  "extractedAt": "2026-02-02T12:00:00.000Z"
}
```

---

## Phase Completion Checklist

### Code Complete
- [ ] QuickExportSection removed
- [ ] Navigation updated (7 cards)
- [ ] Jira wizard page created
- [ ] Tree selector component created
- [ ] Folder generator service created
- [ ] Zip download API created
- [ ] Clear temp API created
- [ ] Settings confirmation updated
- [ ] All tests passing
- [ ] TypeScript: zero errors
- [ ] Lint: zero violations
- [ ] Build: successful

### Functional Testing
- [ ] Platform selection works
- [ ] Tree loads with all epics/stories/subtasks
- [ ] Checkboxes work (select/unselect)
- [ ] Generate button triggers generation
- [ ] Progress bar updates (0-100%)
- [ ] Folder structure correct
- [ ] Markdown files created
- [ ] Evidence exported to references/
- [ ] Zip download works
- [ ] Temp cleanup works
- [ ] Settings "Delete" confirmation works

### Documentation
- [ ] Phase 7.7 doc complete
- [ ] README updated with Jira wizard
- [ ] API docs updated

---

## Notes

- Jira wizard is DEDICATED PAGE (not on home)
- Home page clean with navigation links only
- Platform "mobile" = tickets tagged for both iOS + Android
- Evidence duplicated to all subtasks (simpler than splitting)
- Temp folder persists until user clicks "Clear"
- Settings uses simple "Delete" confirmation (not "DELETE ALL DATA")
- Progress bar uses polling (simpler than SSE)
- Archiver library for zip generation
- All destructive operations logged

---

**Status**: 📝 COMPREHENSIVE PLAN READY
**Estimated Completion**: 2-3 days (14-16 hours)
**Depends On**: Phase 7.6 (✅ Complete)
**Enables**: Complete Jira export workflow with folder structure

---

**Last Updated**: 2026-02-02
**Author**: Claude Opus 4.5
**Review Status**: Ready for Fresh Session Implementation
**Complexity**: High (hierarchical tree UI + folder generation + zip)
