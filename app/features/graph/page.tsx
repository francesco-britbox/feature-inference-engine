'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ForceGraphLegend from '@/components/ForceGraphLegend';
import ForceGraphControls from '@/components/ForceGraphControls';
import type { GraphData, GraphFilters } from '@/lib/types/graph';

const ForceGraph = dynamic(() => import('@/components/ForceGraph'), { ssr: false });

const DEFAULT_FILTERS: GraphFilters = {
  showHierarchyLinks: true,
  showEvidenceLinks: true,
  showEvidenceNodes: false,
  featureTypes: { epic: true, story: true, task: true },
};

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch('/api/features/graph');
        if (!res.ok) throw new Error('Failed to fetch graph data');
        const json: GraphData = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, []);

  const counts = useMemo(() => {
    if (!data) return { features: 0, evidence: 0, hierarchyLinks: 0, evidenceLinks: 0 };
    return {
      features: data.nodes.filter((n) => n.kind === 'feature').length,
      evidence: data.nodes.filter((n) => n.kind === 'evidence').length,
      hierarchyLinks: data.links.filter((l) => l.kind === 'hierarchy').length,
      evidenceLinks: data.links.filter((l) => l.kind === 'evidence').length,
    };
  }, [data]);

  return (
    <div className="container mx-auto py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/features">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to list
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Graph</h1>
          <p className="text-muted-foreground mt-1">
            Interactive relationship graph across all features and evidence
          </p>
        </div>
      </div>

      {/* Controls */}
      {data && (
        <ForceGraphControls filters={filters} onChange={setFilters} counts={counts} />
      )}

      {/* Graph area */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading graph...</div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : data && counts.features === 0 ? (
        <Alert>
          <AlertTitle>No features found</AlertTitle>
          <AlertDescription>
            Upload documents and run inference to discover features, then return here to see the graph.
          </AlertDescription>
        </Alert>
      ) : data ? (
        <div className="relative rounded-lg border bg-white" style={{ height: '70vh' }}>
          <ForceGraph data={data} filters={filters} />
          <ForceGraphLegend />
        </div>
      ) : null}
    </div>
  );
}
