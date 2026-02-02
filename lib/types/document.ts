/**
 * Document types and interfaces
 */

export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

export type FileType = 'pdf' | 'image' | 'json' | 'csv' | 'yaml' | 'md';

export interface Document {
  id: string;
  filename: string;
  fileType: FileType;
  filePath: string;
  fileHash: string;
  status: DocumentStatus;
  uploadedAt: Date;
  processedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentMetadata {
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploader?: string;
}
