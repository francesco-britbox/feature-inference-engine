# Phase 7.6: System Management & Data Operations
**Duration**: 1 day (6-8 hours)
**Dependencies**: Phase 7.5 complete
**Type**: Critical UX + Admin Features

---

## Overview

This phase adds essential system management features for production use:
1. Quick export from home page (UX improvement)
2. Document deletion API and UI (data management)
3. Settings page with dangerous operations (admin tools)
4. PDF extraction investigation and fix (bug fix)

**Goals**:
- Streamline export workflow (reduce clicks)
- Allow document cleanup (delete failed/unwanted uploads)
- Provide nuclear reset option (delete all data)
- Fix PDF extraction (currently extracts 0 items)

---

## Phase Structure

```
Phase 7.6
├── 7.6.1: Quick Export from Home (1 hour)
├── 7.6.2: Document Deletion API + UI (2 hours)
├── 7.6.3: Settings Page with Danger Zone (2 hours)
└── 7.6.4: PDF Extraction Investigation (1-2 hours)
```

**Total**: 6-7 hours (1 day)

---

## Current State (Fact-Checked)

### Database
```
8 tables total:
- documents: 17 records (all "completed")
- evidence: 109 records
- features: 7 records
- feature_evidence: 33 relationships
- feature_outputs: 0 records
- processing_jobs: 17 jobs (all completed)
- enrichment_sources: 0 records
- guideline_cache: 0 records
```

### File Storage
```
app/docs/: 37MB (17 folders with uploaded files)
- Each folder: <document-id>/original.<ext>
```

### APIs Available
```
✅ DELETE /api/features/[id] - Delete feature (exists)
❌ DELETE /api/documents/[id] - Delete document (MISSING)
❌ POST /api/system/reset - Delete all data (MISSING)
```

### Pages Available
```
✅ / - Home page (with Quick Actions)
✅ /features - Features list
✅ /features/[id] - Feature detail
✅ /features/[id]/export - Export page
❌ /settings - Settings page (MISSING)
❌ /documents - Documents management (MISSING)
```

### PDF Extraction Issue
```
Problem: 3 PDFs uploaded, processed, but extracted 0 evidence items
Files:
- FXD-[WIP] Service Managers Matrix.pdf → 0 items ❌
- FXD-[WIP] Service Manager DTO Matrix.pdf → 0 items ❌
- BBIEng-Application API.pdf → 0 items ❌

Status: "completed" (no errors logged)
Likely cause: PDFs are scanned images OR text extraction failed silently
```

---

## Task Breakdown

### 7.6.1: Quick Export from Home Page

**Goal**: Add export shortcuts to home page for faster workflow

#### Current Flow (5 clicks)
```
Home → Features → [Feature] → Export → Select Platform → Download
```

#### New Flow (3 clicks)
```
Home → [Feature Card] → Select Platform → Download
```

#### Implementation

**1. Add Export Quick Action Cards to Home Page**
- [ ] Update `app/page.tsx`
- [ ] Add new section: "Quick Export" below stats
- [ ] Show top 3 confirmed features as cards
- [ ] Each card has platform selector + download buttons
- [ ] Example UI:
  ```tsx
  <Card>
    <CardHeader>
      <CardTitle>User Authentication (0.98 confidence)</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <select className="...">
          <option>Web</option>
          <option>iOS</option>
          <option>Android</option>
        </select>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" onClick={() => export(id, 'json', platform)}>JSON</Button>
          <Button size="sm" onClick={() => export(id, 'md', platform)}>MD</Button>
          <Button size="sm" onClick={() => export(id, 'csv', platform)}>CSV</Button>
        </div>
      </div>
    </CardContent>
  </Card>
  ```

**2. Add "Export" Button to Features List**
- [ ] Update `app/features/page.tsx`
- [ ] Add "Export" button to each feature card/row
- [ ] Opens export page directly: `/features/[id]/export`

**Success Criteria**:
- ✅ Home page shows top 3 features with inline export
- ✅ Features list has "Export" button per feature
- ✅ Reduces export workflow from 5 clicks to 3

---

### 7.6.2: Document Deletion API and UI

**Goal**: Allow users to delete unwanted documents and cleanup failed uploads

#### Missing Components

**1. DELETE /api/documents/[id] Endpoint**
- [ ] Create `app/api/documents/[id]/route.ts`
- [ ] Implement DELETE method:
  ```typescript
  export async function DELETE(req, { params }) {
    const { id } = await params;

    // Delete from database (cascade to evidence, jobs)
    await db.delete(documents).where(eq(documents.id, id));

    // Delete from file system
    await fs.rm(`app/docs/${id}`, { recursive: true });

    return NextResponse.json({ success: true });
  }
  ```
- [ ] Verify cascade deletes (ON DELETE CASCADE):
  - documents → evidence (cascade)
  - documents → processing_jobs (cascade)
- [ ] Error handling for file deletion failures

**2. Documents Management Page**
- [ ] Create `app/documents/page.tsx`
- [ ] List all documents with:
  - Filename
  - Status (uploaded, processing, completed, failed)
  - Evidence count
  - Upload date
  - Delete button (only for failed or uploaded)
- [ ] Filter by status
- [ ] Confirmation dialog before delete

**3. Add Delete Button to Upload Page**
- [ ] Update `app/upload/page.tsx`
- [ ] Add delete icon to each uploaded file row
- [ ] Only show for failed uploads
- [ ] Confirm before delete

**Database Schema Verification**:
```sql
-- Check cascade rules
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('documents', 'evidence', 'processing_jobs');
```

**Expected Cascades**:
- ✅ documents → evidence (ON DELETE CASCADE)
- ✅ documents → processing_jobs (ON DELETE CASCADE)

**Success Criteria**:
- ✅ DELETE /api/documents/[id] endpoint works
- ✅ Deletes database record + file storage
- ✅ Cascade deletes evidence and jobs
- ✅ UI shows delete button for failed/unwanted uploads
- ✅ Confirmation required before delete

---

### 7.6.3: Settings Page with Danger Zone

**Goal**: Admin settings page with nuclear "Delete All" option

#### Settings Page Structure

**1. Create Settings Page**
- [ ] Create `app/settings/page.tsx`
- [ ] Sections:
  - System Information (read-only stats)
  - Database Management
  - Danger Zone (destructive operations)

**2. System Information Section**
```tsx
<Card>
  <CardHeader>
    <CardTitle>System Information</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Documents:</span>
        <Badge>{stats.documents} files</Badge>
      </div>
      <div className="flex justify-between">
        <span>Evidence:</span>
        <Badge>{stats.evidence} items</Badge>
      </div>
      <div className="flex justify-between">
        <span>Features:</span>
        <Badge>{stats.features} inferred</Badge>
      </div>
      <div className="flex justify-between">
        <span>Storage Size:</span>
        <Badge>37 MB</Badge>
      </div>
      <div className="flex justify-between">
        <span>Database Size:</span>
        <Badge>12 MB</Badge>
      </div>
    </div>
  </CardContent>
</Card>
```

**3. Danger Zone Section**
```tsx
<Card className="border-red-200 bg-red-50">
  <CardHeader>
    <CardTitle className="text-red-900 flex items-center gap-2">
      ⚠️ Danger Zone
    </CardTitle>
    <CardDescription className="text-red-700">
      Irreversible operations. Proceed with extreme caution.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <Alert variant="destructive">
      <AlertTitle>Delete All Data</AlertTitle>
      <AlertDescription>
        This will permanently delete:
        - All 17 uploaded documents (37 MB)
        - All 109 evidence items
        - All 7 features
        - All 33 relationships
        - All 17 processing jobs
        - All file storage
      </AlertDescription>
    </Alert>

    <div className="space-y-2">
      <p className="text-sm font-medium">
        Type <code className="bg-red-100 px-2 py-1 rounded">DELETE ALL DATA</code> to confirm:
      </p>
      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type confirmation text..."
      />
      <Button
        variant="destructive"
        disabled={confirmText !== 'DELETE ALL DATA'}
        onClick={handleDeleteAll}
        className="w-full"
      >
        🗑️ Delete All Data (Cannot be undone!)
      </Button>
    </div>
  </CardContent>
</Card>
```

**4. Delete All API Endpoint**
- [ ] Create `app/api/system/reset/route.ts`
- [ ] Implement POST method:
  ```typescript
  export async function POST(req: Request) {
    // Verify confirmation (double-check)
    const { confirmation } = await req.json();

    if (confirmation !== 'DELETE ALL DATA') {
      return NextResponse.json(
        { error: 'Invalid confirmation' },
        { status: 400 }
      );
    }

    // Delete from database (in transaction)
    await db.transaction(async (tx) => {
      await tx.delete(featureOutputs);
      await tx.delete(featureEvidence);
      await tx.delete(features);
      await tx.delete(evidence);
      await tx.delete(processingJobs);
      await tx.delete(enrichmentSources);
      await tx.delete(guidelineCache);
      await tx.delete(documents);
    });

    // Delete file storage
    await fs.rm('app/docs', { recursive: true });
    await fs.mkdir('app/docs');

    return NextResponse.json({ success: true });
  }
  ```

**5. Add Settings Link to Navigation**
- [ ] Update `app/page.tsx` navigation cards
- [ ] Add Settings card or link in header

**Success Criteria**:
- ✅ /settings page accessible
- ✅ Shows current system stats
- ✅ Danger zone requires typing "DELETE ALL DATA"
- ✅ Button disabled until text matches exactly
- ✅ Deletes all 8 tables + file storage
- ✅ Confirmation dialog + second confirmation
- ✅ Success message after deletion
- ✅ Redirects to home after reset

---

### 7.6.4: PDF Extraction Investigation & Fix

**Goal**: Fix PDF extraction (currently extracts 0 items)

#### Investigation Steps

**1. Check PDF File Properties**
- [ ] Verify PDFs are not scanned images
- [ ] Check if text layer exists
- [ ] Test with `pdftotext` command-line tool

**2. Debug PdfExtractor**
- [ ] Add detailed logging to `lib/services/extractors/PdfExtractor.ts`
- [ ] Log: Text length extracted
- [ ] Log: Number of chunks created
- [ ] Log: LLM prompt sent
- [ ] Log: LLM response received
- [ ] Log: Parsed evidence count

**3. Test Text Extraction**
```typescript
// Test in PdfExtractor.ts
const text = await this.extractTextFromPdf(filePath);
logger.info({ documentId, textLength: text.length }, 'PDF text extracted');

if (text.length === 0) {
  logger.warn({ documentId }, 'PDF contains no extractable text - may be scanned image');
  return [];
}
```

**4. Test with Known-Good PDF**
- [ ] Upload a simple text-based PDF (like a README)
- [ ] Verify text extraction works
- [ ] Check evidence generation

**5. Handle Scanned PDFs**
- [ ] Detect when PDF has no text layer
- [ ] Return helpful error: "PDF appears to be a scanned image"
- [ ] Suggest: "Use OCR or re-upload as image"

#### Potential Fixes

**Option 1: PDF is Scanned Image**
```typescript
// lib/services/extractors/PdfExtractor.ts
const text = await pdfParse(buffer);

if (text.text.length < 50) {
  // Likely scanned image with no text layer
  logger.warn({ documentId }, 'PDF has no text - may be scanned');

  // Option: Fall back to Vision API
  return this.extractFromScanWithVision(filePath, documentId);
}
```

**Option 2: Chunking Issue**
```typescript
// Check chunk creation
const chunks = this.chunkText(text, MAX_TOKENS_PER_CHUNK);
logger.info({ chunkCount: chunks.length }, 'Text chunked');

if (chunks.length === 0) {
  logger.error('Chunking produced 0 chunks');
  return [];
}
```

**Option 3: LLM Returns Empty**
```typescript
// In extractFromChunk
const response = await this.llmClient.chat({...});

if (!response.content || response.content.trim().length === 0) {
  logger.warn({ chunk }, 'LLM returned empty response');
  return [];
}
```

**Success Criteria**:
- ✅ Identify root cause of 0 evidence extraction
- ✅ Add detailed logging at each step
- ✅ Handle scanned PDFs gracefully
- ✅ Test with known-good PDF → extracts evidence
- ✅ Update user with helpful error messages

---

## Implementation Order

### Part 1: Quick Wins (3 hours)
1. Quick export from home (1 hour)
2. Document deletion API (1 hour)
3. Add delete buttons to UI (1 hour)

### Part 2: Admin Tools (2 hours)
1. Settings page structure (30 min)
2. System info section (30 min)
3. Danger zone UI (30 min)
4. Reset API endpoint (30 min)

### Part 3: Bug Fix (2 hours)
1. PDF investigation (1 hour)
2. Fix implementation (1 hour)

---

## Detailed Implementation

### 7.6.1: Quick Export from Home

#### File: `app/page.tsx`

**Add after Stats Overview section**:

```tsx
{/* Quick Export for Top Features */}
{stats.features > 0 && (
  <div>
    <h2 className="text-2xl font-bold tracking-tight mb-4">Quick Export</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {topFeatures.map((feature) => (
        <Card key={feature.id}>
          <CardHeader>
            <CardTitle className="text-lg">{feature.name}</CardTitle>
            <CardDescription>
              Confidence: {(parseFloat(feature.confidenceScore) * 100).toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Platform:</label>
              <select
                value={platformSelections[feature.id] || 'ios'}
                onChange={(e) => setPlatformSelection(feature.id, e.target.value)}
                className="w-full mt-1 p-2 border rounded text-sm"
              >
                <option value="ios">iOS</option>
                <option value="android">Android</option>
                <option value="web">Web</option>
                <option value="flutter">Flutter</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadExport(feature.id, 'json', platformSelections[feature.id])}
              >
                JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadExport(feature.id, 'md', platformSelections[feature.id])}
              >
                MD
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadExport(feature.id, 'csv', platformSelections[feature.id])}
              >
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)}
```

**State Management**:
```typescript
const [topFeatures, setTopFeatures] = useState<Feature[]>([]);
const [platformSelections, setPlatformSelections] = useState<Record<string, string>>({});

const fetchTopFeatures = async () => {
  const response = await fetch('/api/features?status=confirmed&limit=3');
  const data = await response.json();
  setTopFeatures(data);
};

const downloadExport = (featureId: string, format: string, platform: string) => {
  window.location.href = `/api/features/${featureId}/export?format=${format}&platform=${platform}`;
};
```

---

### 7.6.2: Document Deletion

#### File 1: `app/api/documents/[id]/route.ts` (NEW)

```typescript
/**
 * Document Detail API
 * GET /api/documents/:id - Get document details
 * DELETE /api/documents/:id - Delete document and associated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents, evidence, processingJobs } from '@/lib/db/schema';
import { createLogger } from '@/lib/utils/logger';
import { NotFoundError } from '@/lib/utils/errors';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ service: 'DocumentAPI' });

/**
 * GET /api/documents/:id
 * Returns document details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!document) {
      throw new NotFoundError('Document', id);
    }

    return NextResponse.json(document, { status: 200 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/:id
 * Deletes document, associated evidence, and file storage
 * Cascades: documents → evidence, documents → processing_jobs
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  logger.info({ documentId: id }, 'Deleting document');

  try {
    // Get document to check existence and get filename
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));

    if (!document) {
      throw new NotFoundError('Document', id);
    }

    // Count associated data for logging
    const evidenceCount = await db
      .select()
      .from(evidence)
      .where(eq(evidence.documentId, id));

    // Delete from database (cascade handles evidence and jobs)
    await db.delete(documents).where(eq(documents.id, id));

    // Delete file storage
    const docPath = path.join(process.cwd(), 'app', 'docs', id);
    try {
      await fs.rm(docPath, { recursive: true, force: true });
      logger.info({ documentId: id, path: docPath }, 'File storage deleted');
    } catch (fsError) {
      logger.warn(
        { documentId: id, path: docPath, error: fsError },
        'File deletion failed (may not exist)'
      );
      // Continue - database deletion succeeded
    }

    logger.info(
      {
        documentId: id,
        filename: document.filename,
        evidenceDeleted: evidenceCount.length,
      },
      'Document deleted successfully'
    );

    return NextResponse.json({
      success: true,
      deleted: {
        document: 1,
        evidence: evidenceCount.length,
      },
    }, { status: 200 });

  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    logger.error(
      { documentId: id, error: error instanceof Error ? error.message : String(error) },
      'Failed to delete document'
    );

    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
```

#### File 2: `app/documents/page.tsx` (NEW)

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DocumentItem {
  id: string;
  filename: string;
  fileType: string;
  status: string;
  uploadedAt: string;
  evidenceCount: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents');
      const docs = await response.json();

      // Fetch evidence count for each document
      const docsWithCounts = await Promise.all(
        docs.map(async (doc: DocumentItem) => {
          const evidenceResponse = await fetch(
            `/api/evidence?documentId=${doc.id}`
          );
          const evidenceData = await evidenceResponse.json();
          return {
            ...doc,
            evidenceCount: evidenceData.items?.length || 0,
          };
        })
      );

      setDocuments(docsWithCounts);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (document: DocumentItem) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
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
        <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage uploaded documents and cleanup failed uploads
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.filename}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.fileType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.status === 'completed' ? 'default' : 'secondary'}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.evidenceCount === 0 ? (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">0 items</span>
                        </div>
                      ) : (
                        <span className="text-sm">{doc.evidenceCount} items</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document?</DialogTitle>
            <DialogDescription>
              This will permanently delete:
              <ul className="mt-2 space-y-1">
                <li>• Document: {documentToDelete?.filename}</li>
                <li>• Evidence: {documentToDelete?.evidenceCount} items</li>
                <li>• File storage</li>
              </ul>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

### 7.6.3: Settings Page

#### File: `app/settings/page.tsx` (NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, AlertTriangle, Database, HardDrive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SystemStats {
  documents: { total: number };
  evidence: { total: number };
  features: { total: number };
  storageSize: string;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats({
        documents: data.documents,
        evidence: data.evidence,
        features: data.features,
        storageSize: '37 MB', // TODO: Get from API
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      alert('Please type the confirmation text exactly');
      return;
    }

    if (!confirm('Are you ABSOLUTELY SURE? This cannot be undone!')) {
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
        throw new Error('Reset failed');
      }

      alert('All data deleted successfully. Redirecting to home...');
      setConfirmText('');
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to reset system:', error);
      alert('Failed to delete all data. Check console for details.');
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
        <p className="text-muted-foreground mt-2">
          System configuration and data management
        </p>
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
              <span className="text-sm font-medium">
                <HardDrive className="h-4 w-4 inline mr-1" />
                Storage Size
              </span>
              <Badge>{stats?.storageSize || 'Calculating...'}</Badge>
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
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li><strong>{stats?.documents.total || 0}</strong> uploaded documents (37 MB)</li>
                <li><strong>{stats?.evidence.total || 0}</strong> evidence items</li>
                <li><strong>{stats?.features.total || 0}</strong> features</li>
                <li><strong>33</strong> relationships</li>
                <li><strong>17</strong> processing jobs</li>
                <li>All file storage in app/docs/</li>
              </ul>
              <p className="mt-3 font-bold">⚠️ THIS CANNOT BE UNDONE ⚠️</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3 p-4 border-2 border-red-300 rounded-lg bg-white">
            <div>
              <p className="text-sm font-medium mb-2">
                Type <code className="bg-red-100 px-2 py-1 rounded font-mono text-red-900">DELETE ALL DATA</code> to confirm:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type confirmation text..."
                className="border-red-300 focus:border-red-500"
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
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Data (Cannot be undone!)
                </>
              )}
            </Button>

            <p className="text-xs text-red-600 text-center">
              This will reset the system to initial state. All uploaded files and generated features will be lost forever.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### File 3: `app/api/system/reset/route.ts` (NEW)

```typescript
/**
 * System Reset API
 * POST /api/system/reset - Delete all data (DANGEROUS)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import {
  documents,
  evidence,
  features,
  featureEvidence,
  featureOutputs,
  processingJobs,
  enrichmentSources,
  guidelineCache,
} from '@/lib/db/schema';
import { createLogger } from '@/lib/utils/logger';
import { activityLogService } from '@/lib/services/ActivityLogService';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger({ service: 'SystemResetAPI' });

/**
 * POST /api/system/reset
 * Deletes ALL data from database and file storage
 * Requires confirmation text: "DELETE ALL DATA"
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  logger.warn('System reset requested');

  try {
    // Parse request body
    const body = await request.json() as { confirmation: string };

    // Verify confirmation
    if (body.confirmation !== 'DELETE ALL DATA') {
      logger.warn({ confirmation: body.confirmation }, 'Invalid confirmation text');
      return NextResponse.json(
        { error: 'Invalid confirmation text. Must be exactly: DELETE ALL DATA' },
        { status: 400 }
      );
    }

    // Count records before deletion
    const counts = {
      documents: await db.select().from(documents).then((r) => r.length),
      evidence: await db.select().from(evidence).then((r) => r.length),
      features: await db.select().from(features).then((r) => r.length),
      featureEvidence: await db.select().from(featureEvidence).then((r) => r.length),
      featureOutputs: await db.select().from(featureOutputs).then((r) => r.length),
      processingJobs: await db.select().from(processingJobs).then((r) => r.length),
      enrichmentSources: await db.select().from(enrichmentSources).then((r) => r.length),
      guidelineCache: await db.select().from(guidelineCache).then((r) => r.length),
    };

    logger.info({ counts }, 'Starting system reset');

    // Delete from database (in transaction for atomicity)
    await db.transaction(async (tx) => {
      // Delete in correct order (children first)
      await tx.delete(featureOutputs);
      await tx.delete(featureEvidence);
      await tx.delete(features);
      await tx.delete(evidence);
      await tx.delete(processingJobs);
      await tx.delete(enrichmentSources);
      await tx.delete(guidelineCache);
      await tx.delete(documents);
    });

    logger.info('Database cleared');

    // Delete file storage
    const docsPath = path.join(process.cwd(), 'app', 'docs');
    try {
      // Remove all subdirectories
      const entries = await fs.readdir(docsPath);
      for (const entry of entries) {
        const entryPath = path.join(docsPath, entry);
        await fs.rm(entryPath, { recursive: true, force: true });
      }
      logger.info({ path: docsPath, filesDeleted: entries.length }, 'File storage cleared');
    } catch (fsError) {
      logger.error(
        { path: docsPath, error: fsError },
        'File deletion failed (may not exist)'
      );
      // Continue - database deletion succeeded
    }

    // Clear activity logs
    activityLogService.clearLogs();

    logger.warn({ counts }, 'System reset completed');

    return NextResponse.json({
      success: true,
      message: 'All data deleted successfully',
      deleted: counts,
    }, { status: 200 });

  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'System reset failed'
    );

    return NextResponse.json(
      { error: 'System reset failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
```

---

## Success Criteria

### Quick Export
- ✅ Home page shows top 3 confirmed features
- ✅ Each feature has platform selector
- ✅ Each feature has 3 download buttons (JSON, MD, CSV)
- ✅ One-click export with platform selection

### Document Deletion
- ✅ DELETE /api/documents/[id] endpoint works
- ✅ Deletes database record + file storage + cascades
- ✅ /documents page lists all documents
- ✅ Delete button per document
- ✅ Confirmation dialog shows what will be deleted
- ✅ Highlights documents with 0 evidence

### Settings & Danger Zone
- ✅ /settings page accessible from navigation
- ✅ Shows current system stats
- ✅ Danger zone requires typing "DELETE ALL DATA"
- ✅ Button disabled until exact match
- ✅ Double confirmation (dialog + browser confirm)
- ✅ Deletes all 8 tables + file storage
- ✅ Clears activity logs
- ✅ Redirects to home after reset
- ✅ Transaction ensures atomicity

### PDF Extraction Fix
- ✅ Root cause identified
- ✅ Detailed logging added
- ✅ Handles scanned PDFs gracefully
- ✅ Test with known-good PDF succeeds
- ✅ User receives helpful error messages

---

## File Changes Summary

### New Files (6 files)
```
app/api/documents/[id]/route.ts          (150 lines)
app/api/system/reset/route.ts            (120 lines)
app/documents/page.tsx                   (200 lines)
app/settings/page.tsx                    (250 lines)
docs/08_PHASE_7_6_SYSTEM_MANAGEMENT.md   (this file)
```

### Modified Files (4 files)
```
app/page.tsx                             (+120 lines - quick export)
app/features/page.tsx                    (+10 lines - export button)
lib/services/extractors/PdfExtractor.ts  (+20 lines - logging)
app/layout.tsx or navigation             (+5 lines - settings link)
```

**Total**: ~875 new lines of code

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Delete all accidentally triggered | Medium | CRITICAL | Double confirmation required |
| Cascade delete fails | Low | High | Use transaction, verify FK constraints |
| File deletion fails after DB delete | Low | Medium | Log warning, continue (DB is source of truth) |
| PDF fix breaks existing extractors | Low | Medium | Test thoroughly, add feature flag |

---

## Code Quality Standards

All code must maintain **95%+ quality score**:
- ✅ TypeScript strict mode
- ✅ SOLID principles
- ✅ DRY principle
- ✅ Error handling with structured errors
- ✅ Logging at appropriate levels
- ✅ Type safety (100% typed)
- ✅ Build successful
- ✅ Zero lint violations

---

## Testing Plan

### Manual Tests
1. **Quick Export**:
   - [ ] Home page shows top 3 features
   - [ ] Change platform → download → verify platform in file
   - [ ] Test JSON, MD, CSV formats

2. **Document Deletion**:
   - [ ] Go to /documents page
   - [ ] Click delete on document with 0 evidence
   - [ ] Confirm deletion
   - [ ] Verify document + evidence + files deleted

3. **Danger Zone**:
   - [ ] Go to /settings
   - [ ] Type incorrect text → button stays disabled
   - [ ] Type "DELETE ALL DATA" → button enables
   - [ ] Click button → double confirmation
   - [ ] Verify all tables empty
   - [ ] Verify app/docs/ empty
   - [ ] Verify redirect to home

4. **PDF Extraction**:
   - [ ] Upload text-based PDF
   - [ ] Check logs for text length
   - [ ] Verify evidence extracted
   - [ ] Upload scanned PDF → see helpful error

---

## Database Cascade Rules (Fact-Checked)

**Current Schema**:
```sql
documents (id)
  ├─ evidence (document_id) → ON DELETE CASCADE ✅
  └─ processing_jobs (document_id) → ON DELETE CASCADE ✅

features (id)
  ├─ feature_evidence (feature_id) → ON DELETE CASCADE ✅
  ├─ feature_outputs (feature_id) → ON DELETE CASCADE ✅
  └─ enrichment_sources (feature_id) → ON DELETE CASCADE ✅

evidence (id)
  └─ feature_evidence (evidence_id) → ON DELETE CASCADE ✅
```

**Delete Order for System Reset**:
```
1. feature_outputs (no dependencies)
2. enrichment_sources (no dependencies)
3. guideline_cache (no dependencies)
4. feature_evidence (depends on features + evidence)
5. features (parent of feature_evidence)
6. processing_jobs (depends on documents)
7. evidence (depends on documents)
8. documents (parent of evidence + processing_jobs)
```

**Verified**: All foreign keys have ON DELETE CASCADE

---

## API Endpoints Summary

### New Endpoints
```
GET    /api/documents/:id       - Get document details
DELETE /api/documents/:id       - Delete document + cascade
POST   /api/system/reset        - Delete all data (dangerous)
```

### Updated Endpoints
```
GET    /api/features            - Add ?limit=3 for top features
```

---

## Navigation Updates

Add Settings link to home page:

```tsx
// app/page.tsx - Update navigationCards array
{
  icon: Settings,
  title: 'Settings',
  description: 'System configuration and data management',
  href: '/settings',
  stats: 'Admin',
  color: 'text-gray-600',
}
```

---

## PDF Investigation Checklist

**Fact-Check Questions**:
1. [ ] Do PDFs have text layer? (Use `pdftotext` to verify)
2. [ ] Does `pdfParse` extract text successfully?
3. [ ] Are chunks being created? (Log chunk count)
4. [ ] Is LLM being called? (Check logs for API calls)
5. [ ] Does LLM return empty response? (Log LLM response)
6. [ ] Are evidence items being parsed? (Log parsed count)

**Debug Logging to Add**:
```typescript
// In PdfExtractor.extract()
logger.info({ documentId, textLength: text.length }, 'Text extracted from PDF');

// In chunkText()
logger.info({ chunkCount: chunks.length, textLength: text.length }, 'Text chunked');

// In extractFromChunk()
logger.info({ chunkLength: chunk.length }, 'Processing chunk');
logger.info({ responseLength: response.content?.length }, 'LLM response received');
logger.info({ evidenceCount: parsed.length }, 'Evidence parsed from chunk');
```

---

## Estimated Timeline

**Day 1** (6-8 hours):
- Morning (3 hours): 7.6.1 Quick Export + 7.6.2 Delete API
- Afternoon (2 hours): 7.6.3 Settings Page
- Evening (1-2 hours): 7.6.4 PDF Investigation

---

## Notes

- Delete all is DANGEROUS - requires double confirmation
- Document deletion safe (only deletes that document's data)
- Quick export improves UX significantly (5 clicks → 3 clicks)
- PDF issue may require OCR or Vision API fallback for scanned images
- All destructive operations are logged
- Transaction ensures atomicity for system reset

---

**Status**: 📝 READY FOR IMPLEMENTATION
**Estimated Completion**: 1 day (6-8 hours)
**Depends On**: Phase 7.5 (✅ Complete)
**Enables**: Production-ready system management

---

**Last Updated**: 2026-02-02
**Author**: Claude Opus 4.5
**Review Status**: Pending User Approval
