'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, RotateCcw, Plus, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface EvidenceItem {
  id: string;
  type: string;
  content: string;
  documentFilename: string;
}

const TYPE_COLORS: Record<string, string> = {
  ui_element: 'bg-blue-100 text-blue-800',
  flow: 'bg-purple-100 text-purple-800',
  endpoint: 'bg-green-100 text-green-800',
  payload: 'bg-yellow-100 text-yellow-800',
  requirement: 'bg-orange-100 text-orange-800',
  edge_case: 'bg-red-100 text-red-800',
  acceptance_criteria: 'bg-teal-100 text-teal-800',
  bug: 'bg-pink-100 text-pink-800',
  constraint: 'bg-gray-100 text-gray-800',
};

export default function CorrelationTestPage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [filteredEvidence, setFilteredEvidence] = useState<EvidenceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    featureName: string;
    confidence: number;
    reasoning: string;
  } | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, []);

  useEffect(() => {
    filterEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidence, search, typeFilter]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/evidence?limit=100');
      const data = await response.json();
      setEvidence(data.items);
      setFilteredEvidence(data.items);
    } catch (error) {
      console.error('Failed to fetch evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvidence = () => {
    let filtered = evidence;

    if (typeFilter) {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    if (search) {
      filtered = filtered.filter((e) =>
        e.content.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredEvidence(filtered);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleTest = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one evidence item');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      // Simulate correlation test (actual API endpoint would be implemented in Phase 4)
      // For now, create a mock result
      const selectedEvidence = evidence.filter((e) => selectedIds.has(e.id));
      const types = new Set(selectedEvidence.map((e) => e.type));

      // Mock inference result
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setResult({
        featureName: 'Test Feature from Selected Evidence',
        confidence: 0.75 + Math.random() * 0.2,
        reasoning: `This feature was inferred from ${selectedIds.size} evidence items across ${types.size} different types: ${Array.from(types).join(', ')}. The evidence suggests a cohesive feature implementation.`,
      });
    } catch (error) {
      console.error('Failed to test correlation:', error);
      alert('Failed to test correlation');
    } finally {
      setTesting(false);
    }
  };

  const handleCreateFeature = async () => {
    if (!result) return;

    try {
      const response = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.featureName,
          description: result.reasoning,
          confidenceScore: result.confidence,
          status: 'candidate',
        }),
      });

      if (response.ok) {
        alert('Feature created successfully!');
        handleReset();
      }
    } catch (error) {
      console.error('Failed to create feature:', error);
      alert('Failed to create feature');
    }
  };

  const handleReset = () => {
    setSelectedIds(new Set());
    setResult(null);
    setSearch('');
    setTypeFilter('');
  };

  const uniqueTypes = Array.from(new Set(evidence.map((e) => e.type)));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Correlation Testing</h1>
        <p className="text-muted-foreground mt-2">
          Manually test feature inference by selecting evidence items
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Evidence Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Evidence Items</CardTitle>
            <CardDescription>
              {selectedIds.size} selected • {filteredEvidence.length} shown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search evidence content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={typeFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter('')}
                >
                  All
                </Button>
                {uniqueTypes.map((type) => (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                  >
                    {type.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Evidence List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : filteredEvidence.length === 0 ? (
                <Alert>
                  <AlertDescription>No evidence found</AlertDescription>
                </Alert>
              ) : (
                filteredEvidence.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedIds.has(item.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="mt-1"
                      />
                      <Badge className={TYPE_COLORS[item.type]}>
                        {item.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm line-clamp-2 ml-6">{item.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                disabled={testing || selectedIds.size === 0}
                className="flex-1"
              >
                {testing ? (
                  'Testing...'
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Correlation
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Inference Result</CardTitle>
            <CardDescription>
              Feature inferred from selected evidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6">
                <div>
                  <Label>Feature Name</Label>
                  <p className="text-xl font-bold mt-1">{result.featureName}</p>
                </div>

                <div>
                  <Label>Confidence Score</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-3xl font-bold text-green-600">
                      {(result.confidence * 100).toFixed(0)}%
                    </div>
                    <Badge variant={result.confidence >= 0.75 ? 'default' : 'secondary'}>
                      {result.confidence >= 0.75 ? 'High' : 'Medium'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Reasoning</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.reasoning}
                  </p>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Button onClick={handleCreateFeature} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Feature
                  </Button>
                  <Button variant="outline" onClick={handleTest} className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Test Again
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTitle>No results yet</AlertTitle>
                <AlertDescription>
                  Select evidence items and click &quot;Test Correlation&quot; to see inference results
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
