'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Evidence {
  id: string;
  type: string;
  content: string;
  relationshipType: string;
  strength: string | null;
  reasoning: string | null;
}

interface FeatureDetail {
  id: string;
  name: string;
  description: string | null;
  confidenceScore: string | null;
  status: string;
  inferredAt: string;
  evidence: Evidence[];
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

const RELATIONSHIP_COLORS: Record<string, string> = {
  implements: 'text-green-600',
  supports: 'text-blue-600',
  constrains: 'text-orange-600',
  extends: 'text-purple-600',
};

export default function FeatureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [feature, setFeature] = useState<FeatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchFeature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  const fetchFeature = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/features/${resolvedParams.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/features');
          return;
        }
        throw new Error('Failed to fetch feature');
      }
      const data = await response.json();
      setFeature(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
    } catch (error) {
      console.error('Failed to fetch feature:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await fetch(`/api/features/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });
      setEditDialogOpen(false);
      fetchFeature();
    } catch (error) {
      console.error('Failed to update feature:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this feature?')) return;

    try {
      await fetch(`/api/features/${resolvedParams.id}`, {
        method: 'DELETE',
      });
      router.push('/features');
    } catch (error) {
      console.error('Failed to delete feature:', error);
    }
  };

  const updateStatus = async (status: 'confirmed' | 'rejected') => {
    try {
      await fetch(`/api/features/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchFeature();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>Feature not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const confidence = parseFloat(feature.confidenceScore || '0');
  const confidencePercent = Math.round(confidence * 100);

  const evidenceByType = feature.evidence.reduce<Record<string, Evidence[]>>((acc, ev) => {
    if (!acc[ev.type]) {
      acc[ev.type] = [];
    }
    acc[ev.type]!.push(ev);
    return acc;
  }, {});

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link href="/features">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Features
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{feature.name}</h1>
            <Badge variant={feature.status === 'confirmed' ? 'default' : 'secondary'}>
              {feature.status}
            </Badge>
            <div className="text-2xl font-bold text-green-600">{confidencePercent}%</div>
          </div>
          {feature.description && (
            <p className="text-muted-foreground mt-2">{feature.description}</p>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Feature</DialogTitle>
                <DialogDescription>Update the feature name and description</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Actions */}
      {feature.status === 'candidate' && (
        <Card>
          <CardContent className="flex gap-2 pt-6">
            <Button onClick={() => updateStatus('confirmed')} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Confirm Feature
            </Button>
            <Button variant="outline" onClick={() => updateStatus('rejected')} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Reject Feature
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Evidence Tabs */}
      <Tabs defaultValue="evidence" className="w-full">
        <TabsList>
          <TabsTrigger value="evidence">Evidence ({feature.evidence.length})</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="evidence" className="space-y-4">
          {Object.keys(evidenceByType).length === 0 ? (
            <Alert>
              <AlertDescription>No evidence linked to this feature</AlertDescription>
            </Alert>
          ) : (
            Object.entries(evidenceByType).map(([type, items]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge className={TYPE_COLORS[type]}>
                      {type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-muted-foreground">({items.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-accent rounded-lg border"
                    >
                      <p className="text-sm">{item.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={RELATIONSHIP_COLORS[item.relationshipType]}>
                          {item.relationshipType}
                        </Badge>
                        {item.strength && (
                          <span className="text-xs text-muted-foreground">
                            strength: {(parseFloat(item.strength) * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Relationships</CardTitle>
              <CardDescription>
                How each piece of evidence relates to this feature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {feature.evidence.map((item) => (
                <div key={item.id} className="flex items-start gap-4 p-3 bg-accent rounded-lg">
                  <Badge className={TYPE_COLORS[item.type]}>
                    {item.type.replace(/_/g, ' ')}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm mb-2">{item.content}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={RELATIONSHIP_COLORS[item.relationshipType]}>
                        {item.relationshipType}
                      </Badge>
                      {item.strength && (
                        <span className="text-xs text-muted-foreground">
                          {(parseFloat(item.strength) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {item.reasoning && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {item.reasoning}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
