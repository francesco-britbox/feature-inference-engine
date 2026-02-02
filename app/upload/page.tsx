'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/lib/hooks/useToast';
import { uploadFiles } from '@/lib/api/documentClient';
import { validateFileUpload, formatFileSize } from '@/lib/utils/fileValidation';
import {
  FILE_UPLOAD_LIMITS,
  ACCEPTED_FILE_TYPES,
} from '@/lib/constants/ui';

interface UploadedFile {
  id: string;
  filename: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  error?: string;
}

export default function UploadPage(): JSX.Element {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocumentStatus = useCallback(async (documentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/documents/${documentId}/status`);
      if (!response.ok) return;

      const data = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === documentId
            ? {
                ...f,
                status: data.status,
                stage: data.progress.message,
                progress: data.status === 'completed' ? 100 : data.status === 'processing' ? 50 : 0,
              }
            : f
        )
      );
    } catch {
      toast.error(
        `Failed to fetch status for document ${documentId}`,
        'Status Update Error'
      );
    }
  }, [toast]);

  // Poll status for processing files
  useEffect(() => {
    const processingFiles = files.filter(
      (f) => f.status === 'uploaded' || f.status === 'processing'
    );

    if (processingFiles.length === 0) return;

    const interval = setInterval(() => {
      processingFiles.forEach((file) => {
        fetchDocumentStatus(file.id);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [files, fetchDocumentStatus]);

  const onDrop = useCallback((acceptedFiles: File[]): void => {
    setSelectedFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: FILE_UPLOAD_LIMITS.MAX_FILES,
    accept: ACCEPTED_FILE_TYPES,
  });

  const handleUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;

    // Validate batch
    const validation = validateFileUpload(selectedFiles);
    if (!validation.valid && validation.error) {
      toast.error(validation.error.message, 'Validation Error');
      return;
    }

    setUploading(true);

    try {
      const result = await uploadFiles(selectedFiles);

      // Add successful uploads
      const newFiles: UploadedFile[] = result.successes.map((success) => ({
        id: success.id,
        filename: success.filename,
        status: 'uploaded' as const,
        progress: 0,
        stage: 'Queued for processing',
      }));

      // Add failures
      const failedFiles: UploadedFile[] = result.failures.map((failure) => ({
        id: `failed-${Date.now()}-${Math.random()}`,
        filename: failure.filename,
        status: 'failed' as const,
        progress: 0,
        stage: 'Upload failed',
        error: `${failure.error}: ${failure.details || ''}`,
      }));

      setFiles((prev) => [...newFiles, ...failedFiles, ...prev]);
      setSelectedFiles([]);

      // Show success toast
      if (newFiles.length > 0) {
        toast.success(
          `Successfully uploaded ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''}`,
          'Upload Complete'
        );
      }

      // Show failure toast
      if (failedFiles.length > 0) {
        toast.error(
          `Failed to upload ${failedFiles.length} file${failedFiles.length !== 1 ? 's' : ''}`,
          'Upload Errors'
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : String(error),
        'Upload Failed'
      );
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: UploadedFile['status']): JSX.Element => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']): JSX.Element => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      uploading: 'secondary',
      uploaded: 'outline',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  const selectedTotalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const selectedSizeMB = formatFileSize(selectedTotalSize);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload screenshots, API specs, PDFs, or CSV files for feature extraction
        </p>
      </div>

      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary'
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop files here' : 'Drag files here or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Up to {FILE_UPLOAD_LIMITS.MAX_FILES} files, {FILE_UPLOAD_LIMITS.MAX_SIZE_MB}MB total
          </p>
          <p className="text-xs text-muted-foreground">
            Supported: PDF, PNG, JPG, JSON, CSV, YAML, Markdown
          </p>
          <input {...getInputProps()} />
        </CardContent>
      </Card>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Files</CardTitle>
            <CardDescription>
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ({selectedSizeMB})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-accent rounded">
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ))}
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-4"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload All'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>
              {files.filter((f) => f.status === 'completed').length} completed,{' '}
              {files.filter((f) => f.status === 'processing' || f.status === 'uploaded').length} processing,{' '}
              {files.filter((f) => f.status === 'failed').length} failed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="space-y-2">
                <div className="flex items-center gap-4">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.filename}</p>
                    <p className="text-sm text-muted-foreground">{file.stage}</p>
                  </div>
                  {file.status !== 'failed' && (
                    <Progress value={file.progress} className="w-24" />
                  )}
                  {getStatusBadge(file.status)}
                </div>
                {file.error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{file.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {files.length === 0 && selectedFiles.length === 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>No files uploaded yet</AlertTitle>
          <AlertDescription>
            Drag and drop files above to begin extracting features
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
