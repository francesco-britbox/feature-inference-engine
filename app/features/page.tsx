'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileText, Check, X, Eye, Download, Network, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FEATURE_STATUS_VARIANTS } from '@/lib/constants/ui';

interface Feature {
  id: string;
  name: string;
  description: string | null;
  confidenceScore: string | null;
  status: string;
  inferredAt: string;
  featureType: 'epic' | 'story' | 'task';
  parentId: string | null;
}

interface FeatureNode extends Feature {
  children: FeatureNode[];
  expanded: boolean;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureNode[]>([]);
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
      const data: Feature[] = await response.json();

      // Build tree structure
      const tree = buildTree(data);
      setFeatures(tree);
    } catch {
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flatList: Feature[]): FeatureNode[] => {
    // Create map for quick lookup
    const map = new Map<string, FeatureNode>();
    flatList.forEach((f) => {
      map.set(f.id, { ...f, children: [], expanded: false });
    });

    // Build tree
    const roots: FeatureNode[] = [];

    flatList.forEach((f) => {
      const node = map.get(f.id)!;

      if (f.parentId && map.has(f.parentId)) {
        // Add to parent's children
        const parent = map.get(f.parentId)!;
        parent.children.push(node);
      } else {
        // Root node (epic with no parent)
        roots.push(node);
      }
    });

    // Sort roots and children by confidence (descending)
    const sortByConfidence = (a: FeatureNode, b: FeatureNode): number => {
      const aScore = parseFloat(a.confidenceScore || '0');
      const bScore = parseFloat(b.confidenceScore || '0');
      return bScore - aScore;
    };

    roots.sort(sortByConfidence);
    roots.forEach((root) => root.children.sort(sortByConfidence));

    return roots;
  };

  const toggleExpanded = (featureId: string): void => {
    const toggle = (items: FeatureNode[]): FeatureNode[] => {
      return items.map((item) => {
        if (item.id === featureId) {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children && item.children.length > 0) {
          return { ...item, children: toggle(item.children) };
        }
        return item;
      });
    };

    setFeatures((prev) => toggle(prev));
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic':
        return <FolderOpen className="h-4 w-4 text-blue-600" />;
      case 'story':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'task':
        return <FileText className="h-4 w-4 text-gray-600" />;
      default:
        return <Folder className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.75) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderTree = (items: FeatureNode[], depth: number = 0): JSX.Element[] => {
    return items.map((item) => {
      const confidence = parseFloat(item.confidenceScore || '0');
      const confidencePercent = Math.round(confidence * 100);

      return (
        <div key={item.id}>
          {/* Feature row */}
          <div
            className="flex items-center gap-2 py-3 px-4 hover:bg-gray-50 border-b"
            style={{ paddingLeft: `${depth * 32 + 16}px` }}
          >
            {/* Expand/collapse button */}
            {item.children && item.children.length > 0 ? (
              <button
                onClick={() => toggleExpanded(item.id)}
                className="p-1 hover:bg-gray-200 rounded"
                aria-label={item.expanded ? 'Collapse' : 'Expand'}
              >
                {item.expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" /> // Spacer for leaf nodes
            )}

            {/* Type icon */}
            {getTypeIcon(item.featureType)}

            {/* Feature name */}
            <Link
              href={`/features/${item.id}`}
              className="flex-1 font-medium hover:underline"
            >
              {item.name}
            </Link>

            {/* Type badge */}
            <Badge
              variant={item.featureType === 'epic' ? 'default' : 'outline'}
              className="text-xs"
            >
              {item.featureType}
            </Badge>

            {/* Status badge */}
            <Badge variant={FEATURE_STATUS_VARIANTS[item.status]} className="text-xs">
              {item.status}
            </Badge>

            {/* Confidence */}
            <div className={`text-sm font-semibold ${getConfidenceColor(confidence)}`}>
              {confidencePercent}%
            </div>

            {/* Children count */}
            {item.children && item.children.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {item.children.length} {item.featureType === 'epic' ? 'stories' : 'subtasks'}
              </Badge>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/features/${item.id}`}>
                <Button size="sm" variant="ghost">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>

              {/* Export button only for epics */}
              {item.featureType === 'epic' && (
                <Link href={`/features/${item.id}/export`}>
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </Link>
              )}

              {/* Status actions */}
              {item.status === 'candidate' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => updateFeatureStatus(item.id, 'confirmed')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateFeatureStatus(item.id, 'rejected')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Render children recursively */}
          {item.expanded && item.children && item.children.length > 0 && (
            <div className="border-l-2 border-gray-200 ml-6">
              {renderTree(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const epicCount = features.length;
  const storyCount = features.reduce(
    (sum, epic) => sum + epic.children.length,
    0
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Features</h1>
          <p className="text-muted-foreground mt-2">
            Hierarchical view of inferred features (epics contain stories)
          </p>
        </div>
        <Link href="/features/graph">
          <Button variant="outline">
            <Network className="h-4 w-4 mr-2" />
            Graph View
          </Button>
        </Link>
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

      {/* Features Tree */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : features.length === 0 ? (
        <Alert>
          <AlertTitle>No features found</AlertTitle>
          <AlertDescription>
            Upload documents and run inference to discover features
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Feature Tree ({epicCount} epics, {storyCount} stories)
            </CardTitle>
            <CardDescription>
              Click the arrow to expand/collapse feature children
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">{renderTree(features)}</CardContent>
        </Card>
      )}
    </div>
  );
}
