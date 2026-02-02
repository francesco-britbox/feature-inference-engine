'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload,
  FileText,
  Brain,
  CheckCircle,
  TrendingUp,
  Play,
  Eye,
  Download,
  Zap,
  ArrowRight,
  Activity,
  Database,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ApiStats {
  documents: {
    total: number;
    byStatus: Record<string, number>;
  };
  evidence: {
    total: number;
    byType: Record<string, number>;
  };
  features: {
    total: number;
    byStatus: {
      candidate?: number;
      confirmed?: number;
      rejected?: number;
    };
    avgConfidence: number;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
  };
}

interface SystemStats {
  documents: number;
  evidence: number;
  features: number;
  confirmed: number;
}

export default function Home() {
  const [stats, setStats] = useState<SystemStats>({
    documents: 0,
    evidence: 0,
    features: 0,
    confirmed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [systemHealthy, setSystemHealthy] = useState(false);

  useEffect(() => {
    fetchStats();
    checkHealth();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data: ApiStats = await response.json();

      // Transform nested API response to flat stats
      setStats({
        documents: data.documents?.total || 0,
        evidence: data.evidence?.total || 0,
        features: data.features?.total || 0,
        confirmed: data.features?.byStatus?.confirmed || 0,
      });
    } catch {
      // Error fetching stats - will show 0s
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      setSystemHealthy(response.ok);
    } catch {
      setSystemHealthy(false);
    }
  };

  const quickActions = [
    {
      icon: Upload,
      title: 'Upload Documents',
      description: 'Add screenshots, API specs, or requirements',
      href: '/upload',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Play,
      title: 'Run Inference',
      description: 'Generate features from uploaded evidence',
      action: 'inference',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Eye,
      title: 'View Features',
      description: 'Review and manage inferred features',
      href: '/features',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

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
    {
      icon: Activity,
      title: 'Status',
      description: 'Monitor processing status and jobs',
      href: '/status',
      stats: systemHealthy ? 'Healthy' : 'Checking...',
      color: 'text-blue-600',
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

  const workflowSteps = [
    {
      number: '1',
      title: 'Upload Documents',
      description: 'Add your requirements, screenshots, API specs, or CSV files',
      icon: Upload,
    },
    {
      number: '2',
      title: 'Extract Evidence',
      description: 'AI automatically extracts atomic facts from your documents',
      icon: FileText,
    },
    {
      number: '3',
      title: 'Run Inference',
      description: 'Generate embeddings, cluster evidence, and infer features',
      icon: Brain,
    },
    {
      number: '4',
      title: 'Review & Export',
      description: 'Validate features and export to Jira-ready tickets',
      icon: Download,
    },
  ];

  const handleInference = async () => {
    try {
      const response = await fetch('/api/inference/run', { method: 'POST' });
      if (response.ok) {
        await fetchStats();
        alert('Inference completed! Check the Features page.');
      } else {
        alert('Inference failed. Check console for details.');
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleActionClick = (action?: string, href?: string) => {
    if (action === 'inference') {
      handleInference();
    } else if (href) {
      window.location.href = href;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Badge variant={systemHealthy ? 'default' : 'secondary'} className="gap-1">
            <Activity className="h-3 w-3" />
            {systemHealthy ? 'System Online' : 'Checking...'}
          </Badge>
        </div>
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Feature Inference Engine
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          AI-powered feature reconstruction for OTT platforms
        </p>
        <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
          Automatically extract features from scattered documents using OpenAI Vision, embeddings, and GPT-4o inference
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.documents}</div>
            <p className="text-xs text-muted-foreground">Uploaded files</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evidence</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.evidence}</div>
            <p className="text-xs text-muted-foreground">Extracted items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.features}</div>
            <p className="text-xs text-muted-foreground">Inferred candidates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">High confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                onClick={() => handleActionClick(action.action, action.href)}
              >
                <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className={`p-4 rounded-full ${action.bgColor}`}>
                    <Icon className={`h-8 w-8 ${action.color}`} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">How It Works</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="relative">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="relative">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {step.number}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Grid */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Explore</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Icon className={`h-5 w-5 ${card.color}`} />
                      <Badge variant="secondary">{card.stats}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">{card.title}</CardTitle>
                    <CardDescription className="text-sm">{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Performance Indicator */}
      {stats.evidence > 0 && stats.features > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900">Inference Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-800">Evidence → Features Conversion</span>
                <span className="font-medium text-green-900">
                  {((stats.features / stats.evidence) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={(stats.features / stats.evidence) * 100} className="h-2" />
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <TrendingUp className="h-4 w-4" />
              <span>
                {stats.confirmed} features confirmed with high confidence (≥0.75)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started */}
      {stats.documents === 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900">👋 Getting Started</CardTitle>
            <CardDescription className="text-blue-700">
              No documents uploaded yet. Start by uploading your first file!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-blue-800">
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Upload screenshots, API specs, or requirements
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Evidence will be extracted automatically
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Run inference to generate features
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Export to Jira-ready tickets
              </p>
            </div>
            <Link href="/upload">
              <Button className="w-full mt-4">
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
