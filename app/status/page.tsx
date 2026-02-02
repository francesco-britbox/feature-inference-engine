'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Database, Layers, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SystemStats {
  documents: {
    total: number;
    byStatus: {
      uploaded: number;
      processing: number;
      completed: number;
      failed: number;
    };
  };
  evidence: {
    total: number;
    byType: Record<string, number>;
  };
  features: {
    total: number;
    byStatus: {
      candidate: number;
      confirmed: number;
      rejected: number;
    };
    avgConfidence: number;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
}

export default function StatusPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch {
      // Error fetching stats - will show failed state
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">Failed to load stats</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
        <p className="text-muted-foreground mt-2">
          Real-time overview of system activity and processing
        </p>
      </div>

      {/* Documents */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Uploaded documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2
              className={`h-4 w-4 text-blue-600 ${
                stats.documents.byStatus.processing > 0 ? 'animate-spin' : ''
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.documents.byStatus.processing}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.documents.byStatus.completed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.documents.byStatus.failed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Processing failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Evidence
          </CardTitle>
          <CardDescription>
            Extracted evidence items by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.evidence.total}</span>
              <span className="text-sm text-muted-foreground">Total evidence items</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(stats.evidence.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-accent rounded">
                  <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Features
            </CardTitle>
            <CardDescription>
              Inferred feature candidates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.features.total}</span>
              <span className="text-sm text-muted-foreground">Total features</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Candidates</span>
                <Badge variant="secondary">{stats.features.byStatus.candidate}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Confirmed</span>
                <Badge variant="default">{stats.features.byStatus.confirmed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Rejected</span>
                <Badge variant="outline">{stats.features.byStatus.rejected}</Badge>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Confidence</span>
                <span className="text-lg font-bold text-green-600">
                  {(stats.features.avgConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Processing Queue
            </CardTitle>
            <CardDescription>
              Background job status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {stats.queue.pending + stats.queue.processing}
              </span>
              <span className="text-sm text-muted-foreground">Active jobs</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending</span>
                <Badge variant="outline">{stats.queue.pending}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Processing</span>
                <Badge variant="secondary">{stats.queue.processing}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Failed</span>
                <Badge variant="destructive">{stats.queue.failed}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
