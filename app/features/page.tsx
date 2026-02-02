'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, X, Eye, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FEATURE_STATUS_VARIANTS, FEATURE_STATUS_COLORS } from '@/lib/constants/ui';

interface Feature {
  id: string;
  name: string;
  description: string | null;
  confidenceScore: string | null;
  status: string;
  inferredAt: string;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchFeatures = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/features?${params}`);
      const data = await response.json();
      setFeatures(data);
    } catch {
      // Error fetching features - will show error state
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  const updateFeatureStatus = async (id: string, status: 'confirmed' | 'rejected'): Promise<void> => {
    try {
      await fetch(`/api/features/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchFeatures();
    } catch {
      // Error updating feature status
    }
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.75) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feature Candidates</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage inferred features from evidence
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'candidate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('candidate')}
            >
              Candidates
            </Button>
            <Button
              variant={statusFilter === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed
            </Button>
            <Button
              variant={statusFilter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('rejected')}
            >
              Rejected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : features.length === 0 ? (
        <Alert>
          <Filter className="h-4 w-4" />
          <AlertTitle>No features found</AlertTitle>
          <AlertDescription>
            Upload documents and run inference to discover features
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {features.map((feature) => {
            const confidence = parseFloat(feature.confidenceScore || '0');
            const confidencePercent = Math.round(confidence * 100);

            return (
              <Card
                key={feature.id}
                className={`border-2 ${FEATURE_STATUS_COLORS[feature.status] || ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{feature.name}</CardTitle>
                        <Badge variant={FEATURE_STATUS_VARIANTS[feature.status]}>
                          {feature.status}
                        </Badge>
                      </div>
                      {feature.description && (
                        <CardDescription>{feature.description}</CardDescription>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-3xl font-bold ${getConfidenceColor(confidence)}`}>
                        {confidencePercent}%
                      </div>
                      <div className="text-xs text-muted-foreground">confidence</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Confidence Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Confidence Score</span>
                    </div>
                    <Progress
                      value={confidencePercent}
                      className="h-2"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/features/${feature.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/features/${feature.id}/export`}>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </Link>
                    {feature.status === 'candidate' && (
                      <>
                        <Button
                          variant="default"
                          onClick={() => updateFeatureStatus(feature.id, 'confirmed')}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateFeatureStatus(feature.id, 'rejected')}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
