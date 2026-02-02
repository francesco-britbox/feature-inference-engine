/**
 * QuickExportSection Component
 * Single Responsibility: Display quick export options for top confirmed features
 *
 * Extracted from app/page.tsx to comply with SRP
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, FileJson, FileText, File, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Feature } from '@/lib/types/feature';
import type { Platform } from '@/lib/types/platform';
import { isPlatform } from '@/lib/types/platform';

interface QuickExportSectionProps {
  features: Feature[];
}

export function QuickExportSection({ features }: QuickExportSectionProps): JSX.Element | null {
  const [platformSelections, setPlatformSelections] = useState<Record<string, Platform>>(() => {
    const initial: Record<string, Platform> = {};
    for (const feature of features) {
      initial[feature.id] = 'ios';
    }
    return initial;
  });

  if (features.length === 0) {
    return null;
  }

  const handlePlatformChange = (featureId: string, value: string): void => {
    if (!isPlatform(value)) {
      return; // Invalid platform value, ignore
    }
    setPlatformSelections((prev) => ({
      ...prev,
      [featureId]: value,
    }));
  };

  const handleDownloadExport = (featureId: string, format: 'json' | 'md' | 'csv'): void => {
    const platform = platformSelections[featureId] || 'ios';
    window.location.href = `/api/features/${featureId}/export?format=${format}&platform=${platform}`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight mb-4">Quick Export</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Export top confirmed features with platform-specific subtasks
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Card key={feature.id} className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="truncate">{feature.name}</span>
                <Badge variant="default" className="ml-2">
                  {typeof feature.confidenceScore === 'string'
                    ? (parseFloat(feature.confidenceScore) * 100).toFixed(0)
                    : ((feature.confidenceScore || 0) * 100).toFixed(0)}
                  %
                </Badge>
              </CardTitle>
              {feature.description && (
                <CardDescription className="line-clamp-2">
                  {feature.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <label htmlFor={`platform-${feature.id}`} className="text-xs font-medium">
                    Platform:
                  </label>
                </div>
                <select
                  id={`platform-${feature.id}`}
                  value={platformSelections[feature.id] || 'ios'}
                  onChange={(e) => handlePlatformChange(feature.id, e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                  <option value="web">Web</option>
                  <option value="flutter">Flutter</option>
                  <option value="react-native">React Native</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadExport(feature.id, 'json');
                  }}
                  className="text-xs"
                >
                  <FileJson className="h-3 w-3 mr-1" />
                  JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadExport(feature.id, 'md');
                  }}
                  className="text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  MD
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadExport(feature.id, 'csv');
                  }}
                  className="text-xs"
                >
                  <File className="h-3 w-3 mr-1" />
                  CSV
                </Button>
              </div>
              <Link href={`/features/${feature.id}/export`}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Full Export Page
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
