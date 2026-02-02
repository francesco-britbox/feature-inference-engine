/**
 * Upload types and interfaces
 */

export interface UploadResult {
  successes: UploadSuccess[];
  failures: UploadFailure[];
}

export interface UploadSuccess {
  id: string;
  filename: string;
  fileHash: string;
}

export interface UploadFailure {
  filename: string;
  error: string;
  details?: string;
}

export interface FileValidationError {
  type:
    | 'INVALID_EXTENSION'
    | 'INVALID_MIME_TYPE'
    | 'FILE_TOO_LARGE'
    | 'MIME_MISMATCH'
    | 'DUPLICATE'
    | 'CONCURRENT_PROCESSING';
  message: string;
  details?: string;
}

export const ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'json',
  'csv',
  'yaml',
  'yml',
  'md',
] as const;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/json',
  'text/csv',
  'application/x-yaml',
  'text/yaml',
  'text/markdown',
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
