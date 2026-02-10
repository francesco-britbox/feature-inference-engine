/**
 * Settings Page
 * System configuration and data management
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertTriangle, Database, HardDrive, Loader2, Settings2, Plus, X, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApiStats {
  documents: { total: number; byStatus: Record<string, number> };
  evidence: { total: number; byType: Record<string, number> };
  features: { total: number; byStatus: Record<string, number>; avgConfidence: number };
  queue: { pending: number; processing: number; failed: number };
}

interface PlatformCheckbox {
  platform: string;
  enabled: boolean;
}

interface RegionEntry {
  name: string;
  enabled: boolean;
}

interface TicketConfigForm {
  projectKey: string;
  projectName: string;
  reporter: string;
  defaultPriority: string;
  targetPlatforms: PlatformCheckbox[];
  targetRegions: RegionEntry[];
  sprintName: string;
  toolName: string;
  authorName: string;
}

const DEFAULT_CONFIG: TicketConfigForm = {
  projectKey: 'PROJ',
  projectName: 'My Project',
  reporter: 'System',
  defaultPriority: 'Medium',
  targetPlatforms: [
    { platform: 'Web', enabled: true },
    { platform: 'iOS', enabled: false },
    { platform: 'Android', enabled: false },
  ],
  targetRegions: [
    { name: 'US', enabled: true },
    { name: 'EU', enabled: true },
  ],
  sprintName: '',
  toolName: 'AI Feature Inference Engine',
  authorName: 'System',
};

export default function SettingsPage(): JSX.Element {
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [storageSize, setStorageSize] = useState('Calculating...');
  const [ticketConfig, setTicketConfig] = useState<TicketConfigForm>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [newRegion, setNewRegion] = useState('');

  useEffect(() => {
    fetchStats();
    calculateStorageSize();
    fetchTicketConfig();
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

  const fetchTicketConfig = async (): Promise<void> => {
    try {
      const response = await fetch('/api/settings/ticket-config');
      if (!response.ok) return;
      const data = await response.json();
      setTicketConfig({
        projectKey: data.projectKey || DEFAULT_CONFIG.projectKey,
        projectName: data.projectName || DEFAULT_CONFIG.projectName,
        reporter: data.reporter || DEFAULT_CONFIG.reporter,
        defaultPriority: data.defaultPriority || DEFAULT_CONFIG.defaultPriority,
        targetPlatforms: data.targetPlatforms || DEFAULT_CONFIG.targetPlatforms,
        targetRegions: data.targetRegions || DEFAULT_CONFIG.targetRegions,
        sprintName: data.sprintName || '',
        toolName: data.toolName || DEFAULT_CONFIG.toolName,
        authorName: data.authorName || DEFAULT_CONFIG.authorName,
      });
    } catch {
      // Use defaults
    }
  };

  const handleSaveConfig = async (): Promise<void> => {
    setSavingConfig(true);
    setConfigSaved(false);
    try {
      const response = await fetch('/api/settings/ticket-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ticketConfig,
          sprintName: ticketConfig.sprintName || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Save failed');
      }
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (error) {
      alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingConfig(false);
    }
  };

  const togglePlatform = (index: number): void => {
    setTicketConfig((prev) => {
      const platforms = [...prev.targetPlatforms];
      platforms[index] = { ...platforms[index]!, enabled: !platforms[index]!.enabled };
      return { ...prev, targetPlatforms: platforms };
    });
  };

  const toggleRegion = (index: number): void => {
    setTicketConfig((prev) => {
      const regions = [...prev.targetRegions];
      regions[index] = { ...regions[index]!, enabled: !regions[index]!.enabled };
      return { ...prev, targetRegions: regions };
    });
  };

  const addRegion = (): void => {
    if (!newRegion.trim()) return;
    setTicketConfig((prev) => ({
      ...prev,
      targetRegions: [...prev.targetRegions, { name: newRegion.trim(), enabled: true }],
    }));
    setNewRegion('');
  };

  const removeRegion = (index: number): void => {
    setTicketConfig((prev) => ({
      ...prev,
      targetRegions: prev.targetRegions.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteAll = async (): Promise<void> => {
    if (confirmText !== 'Delete') {
      alert('Please type the confirmation text exactly: Delete');
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

      {/* Ticket Generation Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Ticket Generation
          </CardTitle>
          <CardDescription>
            Configure project defaults for Jira ticket export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Project Key + Project Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectKey">Project Key</Label>
              <Input
                id="projectKey"
                value={ticketConfig.projectKey}
                onChange={(e) => setTicketConfig((p) => ({ ...p, projectKey: e.target.value.toUpperCase() }))}
                placeholder="W2C"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">Used as ticket prefix (e.g., W2C-100)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={ticketConfig.projectName}
                onChange={(e) => setTicketConfig((p) => ({ ...p, projectName: e.target.value }))}
                placeholder="My Project"
              />
            </div>
          </div>

          {/* Row 2: Reporter + Author */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporter">Reporter</Label>
              <Input
                id="reporter"
                value={ticketConfig.reporter}
                onChange={(e) => setTicketConfig((p) => ({ ...p, reporter: e.target.value }))}
                placeholder="Francesco Farruggia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorName">Author Name</Label>
              <Input
                id="authorName"
                value={ticketConfig.authorName}
                onChange={(e) => setTicketConfig((p) => ({ ...p, authorName: e.target.value }))}
                placeholder="System"
              />
            </div>
          </div>

          {/* Row 3: Tool Name + Sprint */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="toolName">Tool Name</Label>
              <Input
                id="toolName"
                value={ticketConfig.toolName}
                onChange={(e) => setTicketConfig((p) => ({ ...p, toolName: e.target.value }))}
                placeholder="AI Feature Inference Engine"
              />
              <p className="text-xs text-muted-foreground">Appears in the export footer</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprintName">Sprint Name (optional)</Label>
              <Input
                id="sprintName"
                value={ticketConfig.sprintName}
                onChange={(e) => setTicketConfig((p) => ({ ...p, sprintName: e.target.value }))}
                placeholder="Sprint 1"
              />
            </div>
          </div>

          {/* Target Platforms */}
          <div className="space-y-3">
            <Label>Target Platforms</Label>
            <div className="flex gap-6">
              {ticketConfig.targetPlatforms.map((p, i) => (
                <div key={p.platform} className="flex items-center gap-2">
                  <Checkbox
                    id={`platform-${p.platform}`}
                    checked={p.enabled}
                    onCheckedChange={() => togglePlatform(i)}
                  />
                  <Label htmlFor={`platform-${p.platform}`} className="font-normal cursor-pointer">
                    {p.platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Target Regions */}
          <div className="space-y-3">
            <Label>Target Regions</Label>
            <div className="flex flex-wrap gap-2">
              {ticketConfig.targetRegions.map((r, i) => (
                <div key={`${r.name}-${i}`} className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1">
                  <Checkbox
                    id={`region-${r.name}`}
                    checked={r.enabled}
                    onCheckedChange={() => toggleRegion(i)}
                  />
                  <Label htmlFor={`region-${r.name}`} className="font-normal cursor-pointer text-sm">
                    {r.name}
                  </Label>
                  <button
                    type="button"
                    onClick={() => removeRegion(i)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder="Add region..."
                className="max-w-[200px]"
                onKeyDown={(e) => e.key === 'Enter' && addRegion()}
              />
              <Button variant="outline" size="sm" onClick={addRegion} disabled={!newRegion.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
            {configSaved && (
              <span className="text-sm text-green-600 font-medium">Saved</span>
            )}
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
                  Delete
                </code>{' '}
                to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type 'Delete'..."
                className="border-red-300 focus-visible:ring-red-500"
                disabled={deleting}
              />
            </div>

            <Button
              variant="destructive"
              disabled={confirmText !== 'Delete' || deleting}
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
