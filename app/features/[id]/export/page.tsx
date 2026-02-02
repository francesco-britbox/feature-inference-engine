'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, FileJson, FileText, File, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Platform } from '@/lib/types/platform';
import { isPlatform } from '@/lib/types/platform';

interface JiraStory {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints?: number;
  labels?: string[];
  priority?: string;
  evidenceIds: string[];
}

interface JiraEpic {
  title: string;
  description: string;
  acceptanceCriteria: {
    scenarios: Array<{
      given: string;
      when: string;
      then: string;
    }>;
    edgeCases?: string[];
    notes?: string[];
  };
  apiContracts?: {
    endpoints: Array<{
      method: string;
      path: string;
      description: string;
      auth: string;
    }>;
  };
  requirements?: {
    title: string;
    summary: string;
    functionalRequirements: string[];
  };
  stories: JiraStory[];
  labels?: string[];
  priority?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-blue-100 text-blue-800',
  Lowest: 'bg-gray-100 text-gray-800',
};

/**
 * Parse acceptance criteria text into structured format
 */
function parseAcceptanceCriteria(text: string): JiraEpic['acceptanceCriteria'] {
  const scenarios: Array<{ given: string; when: string; then: string }> = [];
  const lines = text.split('\n');

  let currentScenario: { given?: string; when?: string; then?: string } = {};

  for (const line of lines) {
    if (line.startsWith('Given ')) {
      if (currentScenario.given) {
        if (currentScenario.given && currentScenario.when && currentScenario.then) {
          scenarios.push({
            given: currentScenario.given,
            when: currentScenario.when,
            then: currentScenario.then,
          });
        }
        currentScenario = {};
      }
      currentScenario.given = line.replace('Given ', '');
    } else if (line.startsWith('When ')) {
      currentScenario.when = line.replace('When ', '');
    } else if (line.startsWith('Then ')) {
      currentScenario.then = line.replace('Then ', '');
    }
  }

  if (currentScenario.given && currentScenario.when && currentScenario.then) {
    scenarios.push({
      given: currentScenario.given,
      when: currentScenario.when,
      then: currentScenario.then,
    });
  }

  return { scenarios };
}

/**
 * Parse API contracts text into structured format
 */
function parseApiContracts(text: string): JiraEpic['apiContracts'] {
  const endpoints = text.split('\n').map((line) => {
    const match = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+):\s+(.+)$/);
    if (match) {
      return {
        method: match[1]!,
        path: match[2]!,
        description: match[3]!,
        auth: 'none',
      };
    }
    return null;
  }).filter((e): e is NonNullable<typeof e> => e !== null);

  return { endpoints };
}

/**
 * Format epic as Markdown text
 */
function formatAsMarkdown(epic: JiraEpic): string {
  const lines: string[] = [];

  lines.push(`# Epic: ${epic.title}`);
  lines.push('');
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

  lines.push('## User Stories');
  lines.push('');
  for (let i = 0; i < epic.stories.length; i++) {
    const story = epic.stories[i]!;
    lines.push(`### Story ${i + 1}: ${story.title}`);
    lines.push('');
    lines.push(story.description);
    lines.push('');
  }

  return lines.join('\n');
}

export default function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [epic, setEpic] = useState<JiraEpic | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'json' | 'md'>('md');
  const [previewContent, setPreviewContent] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');

  useEffect(() => {
    fetchEpic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id, selectedPlatform]);

  const fetchEpic = async (): Promise<void> => {
    setLoading(true);
    try {
      // Generate epic by fetching export endpoint with JSON format and optional platform
      const platformParam = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';
      const response = await fetch(
        `/api/features/${resolvedParams.id}/export?format=json${platformParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate epic');
      }

      const text = await response.text();
      const data = JSON.parse(text);

      // Extract epic from JSON export format
      if (data.projects && data.projects[0] && data.projects[0].issues) {
        const epicIssue = data.projects[0].issues[0];
        const storyIssues = data.projects[0].issues.slice(1);

        const reconstructedEpic: JiraEpic = {
          title: epicIssue.summary,
          description: epicIssue.description,
          priority: epicIssue.priority,
          labels: epicIssue.labels,
          acceptanceCriteria: epicIssue.customFields?.acceptanceCriteria
            ? parseAcceptanceCriteria(epicIssue.customFields.acceptanceCriteria)
            : { scenarios: [] },
          apiContracts: epicIssue.customFields?.apiContracts
            ? parseApiContracts(epicIssue.customFields.apiContracts)
            : undefined,
          stories: storyIssues.map((story: {
            summary: string;
            description: string;
            acceptanceCriteria: string;
            priority: string;
            labels: string[];
            storyPoints?: number;
          }) => ({
            title: story.summary,
            description: story.description,
            acceptanceCriteria: story.acceptanceCriteria
              ? story.acceptanceCriteria.split('\n')
              : [],
            priority: story.priority,
            labels: story.labels,
            storyPoints: story.storyPoints,
            evidenceIds: [],
          })),
        };

        setEpic(reconstructedEpic);
      }
    } catch (error) {
      console.error('Failed to fetch epic:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDownload = async (format: 'json' | 'md' | 'csv'): Promise<void> => {
    try {
      const platformParam = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';
      const response = await fetch(
        `/api/features/${resolvedParams.id}/export?format=${format}${platformParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${epic?.title.toLowerCase().replace(/\s+/g, '-') || 'epic'}.${format === 'md' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleCopyToClipboard = async (): Promise<void> => {
    if (!epic) return;

    const text = formatAsMarkdown(epic);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreview = async (format: 'json' | 'md'): Promise<void> => {
    try {
      const platformParam = selectedPlatform !== 'all' ? `&platform=${selectedPlatform}` : '';
      const response = await fetch(
        `/api/features/${resolvedParams.id}/export?format=${format}${platformParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const content = await response.text();
      setPreviewContent(content);
      setPreviewFormat(format);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Failed to preview:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">
          Generating export...
        </div>
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Failed to generate epic</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href={`/features/${resolvedParams.id}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feature
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Export Epic</h1>
            <Badge className={PRIORITY_COLORS[epic.priority || 'Medium']}>
              {epic.priority || 'Medium'}
            </Badge>
            {selectedPlatform !== 'all' && (
              <Badge variant="outline" className="gap-1">
                <Smartphone className="h-3 w-3" />
                {selectedPlatform.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {epic.title}
          </p>
        </div>
      </div>

      {/* Platform Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Target Platform
          </CardTitle>
          <CardDescription>
            Select the platform for platform-specific story generation and subtasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="platform-select" className="text-sm font-medium">
              Platform:
            </label>
            <select
              id="platform-select"
              value={selectedPlatform}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all' || isPlatform(value)) {
                  setSelectedPlatform(value as Platform | 'all');
                }
              }}
              className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Platforms</option>
              <option value="web">Web</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
              <option value="flutter">Flutter</option>
              <option value="react-native">React Native</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>
            Download or preview the epic in different formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleDownload('json')}
              className="flex items-center justify-center gap-2"
            >
              <FileJson className="h-4 w-4" />
              Download JSON
            </Button>
            <Button
              onClick={() => handleDownload('md')}
              className="flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Download Markdown
            </Button>
            <Button
              onClick={() => handleDownload('csv')}
              className="flex items-center justify-center gap-2"
            >
              <File className="h-4 w-4" />
              Download CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => handlePreview('json')}
              className="flex items-center justify-center gap-2"
            >
              <FileJson className="h-4 w-4" />
              Preview JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePreview('md')}
              className="flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Preview Markdown
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Epic Preview */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stories">Stories ({epic.stories.length})</TabsTrigger>
          <TabsTrigger value="acceptance">Acceptance Criteria</TabsTrigger>
          {epic.apiContracts && <TabsTrigger value="api">API Contracts</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{epic.title}</CardTitle>
              <CardDescription>
                {epic.labels && epic.labels.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {epic.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {epic.description.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stories" className="space-y-4">
          {epic.stories.map((story, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Story {i + 1}: {story.title}
                  {story.storyPoints && (
                    <Badge variant="outline">{story.storyPoints} pts</Badge>
                  )}
                </CardTitle>
                {story.labels && story.labels.length > 0 && (
                  <div className="flex gap-2">
                    {story.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  {story.description.split('\n').map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>

                {story.acceptanceCriteria.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Acceptance Criteria</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {story.acceptanceCriteria.map((criterion, k) => (
                        <li key={k} className="text-sm">
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="acceptance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acceptance Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {epic.acceptanceCriteria.scenarios.map((scenario, i) => (
                <div key={i} className="p-4 bg-accent rounded-lg">
                  <h4 className="font-semibold mb-2">Scenario {i + 1}</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Given:</strong> {scenario.given}
                    </p>
                    <p>
                      <strong>When:</strong> {scenario.when}
                    </p>
                    <p>
                      <strong>Then:</strong> {scenario.then}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {epic.apiContracts && (
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Contracts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {epic.apiContracts.endpoints.map((endpoint, i) => (
                  <div key={i} className="p-4 bg-accent rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{endpoint.method}</Badge>
                      <code className="text-sm">{endpoint.path}</code>
                    </div>
                    <p className="text-sm">{endpoint.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Auth: {endpoint.auth}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Preview - {previewFormat === 'json' ? 'JSON' : 'Markdown'}
            </DialogTitle>
            <DialogDescription>
              Preview of the exported content
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-accent p-4 rounded-lg overflow-x-auto text-xs">
            <code>{previewContent}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
