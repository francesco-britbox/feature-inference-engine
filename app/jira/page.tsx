/**
 * Jira Generation Wizard Page
 * Single Responsibility: Guide users through Jira ticket generation process
 *
 * Step 1: Platform selection (iOS, Android, Mobile, Web)
 * Step 2: Tree selection (epics, stories, subtasks)
 * Step 3: Generation progress and download
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Smartphone, Check, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { JiraTreeSelector } from '@/components/JiraTreeSelector';

type PlatformSelection = 'ios' | 'android' | 'mobile' | 'web';

interface PlatformInfo {
  name: string;
  description: string;
  icon: string;
  tags: string[];
}

const PLATFORM_INFO: Record<PlatformSelection, PlatformInfo> = {
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

export default function JiraWizardPage(): JSX.Element {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformSelection | null>(null);
  const [selectedItems, setSelectedItems] = useState<{
    epics: string[];
    stories: string[];
    subtasks: string[];
  }>({
    epics: [],
    stories: [],
    subtasks: [],
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlatformSelect = (platform: PlatformSelection): void => {
    setSelectedPlatform(platform);
  };

  const handleNextToStep2 = (): void => {
    if (step === 1 && selectedPlatform) {
      setStep(2);
    }
  };

  const handleBackToStep1 = (): void => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSelectionChange = (selection: {
    epics: string[];
    stories: string[];
    subtasks: string[];
  }): void => {
    setSelectedItems(selection);
  };

  const handleGenerate = async (): Promise<void> => {
    if (!selectedPlatform) return;

    setGenerating(true);
    setProgress(0);
    setProgressMessage('Starting generation...');
    setError(null);
    setStep(3);

    try {
      // Call generation API
      const response = await fetch('/api/jira/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          selectedEpics: selectedItems.epics,
          selectedStories: selectedItems.stories,
          selectedSubtasks: selectedItems.subtasks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Generation failed');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setProgress(100);
      setProgressMessage('Generation complete!');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(0);
      setProgressMessage('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (): void => {
    if (!sessionId) return;
    window.location.href = `/api/jira/download/${sessionId}`;
  };

  const handleClearTemp = async (): Promise<void> => {
    try {
      const response = await fetch('/api/jira/clear', { method: 'POST' });
      if (response.ok) {
        alert('Temporary files cleared successfully');
        setSessionId(null);
      } else {
        alert('Failed to clear temporary files');
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
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
                {(Object.entries(PLATFORM_INFO) as [PlatformSelection, PlatformInfo][]).map(([key, info]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedPlatform === key
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border-2 border-transparent hover:border-border'
                    }`}
                    onClick={() => handlePlatformSelect(key)}
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
            <Button onClick={handleNextToStep2} disabled={!selectedPlatform} size="lg">
              Next: Select Epics & Stories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Tree Selection */}
      {step === 2 && selectedPlatform && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Select Epics, Stories, and Subtasks</CardTitle>
              <CardDescription>
                Choose which items to include in the generated folder structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JiraTreeSelector
                platform={selectedPlatform}
                onSelectionChange={handleSelectionChange}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button onClick={handleBackToStep1} variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedItems.epics.length === 0}
              size="lg"
            >
              Generate Structure
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generation Progress & Download */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {generating ? 'Generating Folder Structure...' : progress === 100 ? 'Generation Complete!' : 'Generation Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progressMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

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
                    onClick={() => (window.location.href = '/')}
                    className="w-full"
                  >
                    Back to Home
                  </Button>
                </div>
              )}

              {!generating && progress === 0 && error && (
                <Button
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Selection
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
