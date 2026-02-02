/**
 * Documents Management Page
 * View and manage all uploaded documents
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trash2, FileText, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DocumentItem {
  id: string;
  filename: string;
  fileType: string;
  status: string;
  uploadedAt: string;
  processedAt: string | null;
  errorMessage: string | null;
  evidenceCount?: number;
}

export default function DocumentsPage(): JSX.Element {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const docs: DocumentItem[] = await response.json();

      // Fetch evidence count for each document
      const docsWithCounts = await Promise.all(
        docs.map(async (doc) => {
          try {
            const evidenceResponse = await fetch(`/api/evidence?documentId=${doc.id}`);
            if (!evidenceResponse.ok) {
              return { ...doc, evidenceCount: 0 };
            }
            const evidenceData = await evidenceResponse.json();
            return {
              ...doc,
              evidenceCount: evidenceData.pagination?.total || evidenceData.items?.length || 0,
            };
          } catch {
            return { ...doc, evidenceCount: 0 };
          }
        })
      );

      setDocuments(docsWithCounts);
    } catch {
      // Silent fail - show error state
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (document: DocumentItem): void => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!documentToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Success - close dialog and refresh list
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      await fetchDocuments();
    } catch (error) {
      alert(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage uploaded documents and cleanup failed uploads
            </p>
          </div>
          <Button variant="outline" onClick={fetchDocuments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
          <CardDescription>
            View all documents and delete unwanted files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : documents.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>No documents found</AlertTitle>
              <AlertDescription>Upload documents to get started</AlertDescription>
            </Alert>
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
                    <TableCell className="font-medium max-w-md truncate">
                      {doc.filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {doc.fileType.split('/')[1] || doc.fileType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {doc.evidenceCount === 0 ? (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">0 items</span>
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
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
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
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>
                  <strong>Document:</strong> {documentToDelete?.filename}
                </li>
                <li>
                  <strong>Evidence:</strong> {documentToDelete?.evidenceCount || 0} items
                </li>
                <li>
                  <strong>File storage:</strong> app/docs/{documentToDelete?.id}/
                </li>
              </ul>
              <p className="mt-3 font-bold text-red-600">⚠️ This action cannot be undone</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
