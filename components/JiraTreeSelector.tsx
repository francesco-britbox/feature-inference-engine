/**
 * Jira Tree Selector Component
 * Single Responsibility: Display hierarchical tree of epics/stories/subtasks with selection
 *
 * Features:
 * - Fetch features and generate epics
 * - Display tree with checkboxes
 * - Expand/collapse nodes
 * - Cascading selection (epic → stories → subtasks)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Feature } from '@/lib/types/feature';

/**
 * API response types from export endpoint
 */
interface ApiSubtask {
  title: string;
  description: string;
  timeEstimate: string;
  assignee?: string;
}

interface ApiStory {
  summary: string;
  description: string;
  storyPoints?: number;
  subtasks?: ApiSubtask[];
  labels?: string[];
  priority?: string;
}

interface ApiEpicIssue {
  summary: string;
  description: string;
  labels?: string[];
  priority?: string;
}

interface ApiExportResponse {
  projects: Array<{
    issues: Array<ApiEpicIssue | ApiStory>;
  }>;
}

/**
 * Internal tree node types
 */
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
  id: string;
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

export function JiraTreeSelector({ platform, onSelectionChange }: JiraTreeSelectorProps): JSX.Element {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEpicsWithStoriesAndSubtasks = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all features
      const featuresResponse = await fetch('/api/features');
      if (!featuresResponse.ok) {
        throw new Error('Failed to fetch features');
      }
      const features = await featuresResponse.json();

      // For each feature, generate epic with stories and subtasks
      const epicsData: Epic[] = await Promise.all(
        features.map(async (feature: Feature) => {
          try {
            // Generate epic with platform parameter
            const epicResponse = await fetch(
              `/api/features/${feature.id}/export?format=json&platform=${platform}`
            );

            if (!epicResponse.ok) {
              return null;
            }

            const epicData = await epicResponse.json() as ApiExportResponse;
            const projects = epicData.projects || [];
            if (projects.length === 0) {
              return null;
            }

            const firstProject = projects[0];
            if (!firstProject) {
              return null;
            }

            const issues = firstProject.issues || [];
            if (issues.length === 0) {
              return null;
            }

            // Epic issue is at index 0, stories start at index 1
            const storyIssues = issues.slice(1) as ApiStory[];

            return {
              id: feature.id,
              name: feature.name,
              description: feature.description || '',
              confidence: typeof feature.confidenceScore === 'number'
                ? feature.confidenceScore
                : parseFloat(feature.confidenceScore || '0'),
              stories: storyIssues.map((story: ApiStory, storyIndex: number) => ({
                id: `${feature.id}-story-${storyIndex}`,
                title: String(story.summary),
                description: String(story.description),
                storyPoints: story.storyPoints || 0,
                subtasks: (story.subtasks || []).map((subtask: ApiSubtask, subtaskIndex: number) => ({
                  id: `${feature.id}-story-${storyIndex}-subtask-${subtaskIndex}`,
                  title: String(subtask.title),
                  description: String(subtask.description),
                  timeEstimate: String(subtask.timeEstimate),
                  selected: true,
                })),
                selected: true,
                expanded: false,
              })),
              selected: true,
              expanded: false,
            };
          } catch (error) {
            console.error(`Failed to generate epic for feature ${feature.id}:`, error);
            return null;
          }
        })
      );

      setEpics(epicsData.filter((e): e is Epic => e !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchEpicsWithStoriesAndSubtasks();
  }, [fetchEpicsWithStoriesAndSubtasks]);

  const toggleEpic = (epicId: string): void => {
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

  const toggleStory = (epicId: string, storyId: string): void => {
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

  const toggleSubtask = (epicId: string, storyId: string, subtaskId: string): void => {
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

  const toggleExpanded = (epicId: string, storyId?: string): void => {
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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No features found. Please run inference first.
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
