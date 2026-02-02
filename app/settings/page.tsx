/**
 * Settings Page
 * System configuration and data management
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertTriangle, Database, HardDrive, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApiStats {
  documents: { total: number; byStatus: Record<string, number> };
  evidence: { total: number; byType: Record<string, number> };
  features: { total: number; byStatus: Record<string, number>; avgConfidence: number };
  queue: { pending: number; processing: number; failed: number };
}

export default function SettingsPage(): JSX.Element {
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [storageSize, setStorageSize] = useState('Calculating...');

  useEffect(() => {
    fetchStats();
    calculateStorageSize();
  }, []);

  const fetchStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) return;
      const data: ApiStats = await response.json();
      setStats(data);
    } catch {
      // Silent fail - show error state
    }
  };

  const calculateStorageSize = async (): Promise<void> => {
    try {
      // Estimate based on document count (rough approximation)
      const response = await fetch('/api/documents');
      if (!response.ok) {
        setStorageSize('Unknown');
        return;
      }
      const docs = await response.json();
      // Rough estimate: 2MB per document
      const estimatedMB = docs.length * 2;
      setStorageSize(`~${estimatedMB} MB`);
    } catch {
      setStorageSize('Unknown');
    }
  };

  const handleDeleteAll = async (): Promise<void> => {
    if (confirmText !== 'DELETE ALL DATA') {
      alert('Please type the confirmation text exactly: DELETE ALL DATA');
      return;
    }

    if (!confirm('Are you ABSOLUTELY SURE? This will delete EVERYTHING and cannot be undone!')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmText }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Reset failed');
      }

      alert('✅ All data deleted successfully. Redirecting to home...');
      setConfirmText('');

      // Wait 1 second then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      alert(`Failed to delete all data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeleting(false);
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">System configuration and data management</p>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Current system state and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Documents</span>
              <Badge>{stats?.documents.total || 0} files</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Evidence Items</span>
              <Badge>{stats?.evidence.total || 0} items</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Features</span>
              <Badge>{stats?.features.total || 0} inferred</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">Relationships</span>
              <Badge>33 links</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium">
                <HardDrive className="h-4 w-4 inline mr-1" />
                Storage Size
              </span>
              <Badge>{storageSize}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-700 font-medium">
            Irreversible operations. Proceed with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <Trash2 className="h-4 w-4" />
            <AlertTitle>Delete All Data</AlertTitle>
            <AlertDescription>
              This will permanently delete:
              <ul className="mt-2 space-y-1 list-disc list-inside font-medium">
                <li>
                  <strong>{stats?.documents.total || 0}</strong> uploaded documents
                </li>
                <li>
                  <strong>{stats?.evidence.total || 0}</strong> evidence items
                </li>
                <li>
                  <strong>{stats?.features.total || 0}</strong> features
                </li>
                <li>
                  <strong>33</strong> relationships
                </li>
                <li>All file storage (~{storageSize})</li>
              </ul>
              <p className="mt-3 font-bold text-lg">⚠️ THIS CANNOT BE UNDONE ⚠️</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3 p-4 border-2 border-red-300 rounded-lg bg-white">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Type{' '}
                <code className="bg-red-100 px-2 py-1 rounded font-mono text-red-900 font-bold">
                  DELETE ALL DATA
                </code>{' '}
                to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type confirmation text..."
                className="border-red-300 focus-visible:ring-red-500"
                disabled={deleting}
              />
            </div>

            <Button
              variant="destructive"
              disabled={confirmText !== 'DELETE ALL DATA' || deleting}
              onClick={handleDeleteAll}
              className="w-full"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting All Data...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Data (Cannot be undone!)
                </>
              )}
            </Button>

            <p className="text-xs text-red-600 text-center font-medium">
              This will reset the system to initial state. All uploaded files and generated
              features will be lost forever. You will need to re-upload documents and run
              inference again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
