/**
 * File validation utilities
 */

import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  type AllowedExtension,
  type AllowedMimeType,
  type FileValidationError,
} from '@/lib/types/upload';
import { FileTooLargeError } from './errors';

/**
 * Maximum file size per file (50MB)
 */
const MAX_FILE_SIZE_BYTES = parseInt(
  process.env.MAX_FILE_SIZE_MB || '50',
  10
) * 1024 * 1024;

/**
 * Calculate SHA-256 hash of file buffer
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || '';
}

/**
 * Map file extension to FileType
 */
export function mapExtensionToFileType(extension: string): string {
  const mapping: Record<string, string> = {
    pdf: 'pdf',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    json: 'json',
    csv: 'csv',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'md',
  };

  return mapping[extension] || 'unknown';
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): FileValidationError | null {
  const extension = getFileExtension(filename);

  if (!extension) {
    return {
      type: 'INVALID_EXTENSION',
      message: 'File has no extension',
    };
  }

  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    return {
      type: 'INVALID_EXTENSION',
      message: `File extension .${extension} not allowed`,
      details: `Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return null;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): FileValidationError | null {
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(size, MAX_FILE_SIZE_BYTES);
  }

  return null;
}

/**
 * Validate MIME type from file buffer
 */
export async function validateMimeType(
  buffer: Buffer,
  filename: string
): Promise<FileValidationError | null> {
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    // For text-based files (CSV, YAML, MD), file-type may not detect
    const extension = getFileExtension(filename);
    if (['csv', 'yaml', 'yml', 'md', 'json'].includes(extension)) {
      return null; // Allow text files
    }

    return {
      type: 'INVALID_MIME_TYPE',
      message: 'Could not determine file type',
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(fileType.mime as AllowedMimeType)) {
    return {
      type: 'INVALID_MIME_TYPE',
      message: `MIME type ${fileType.mime} not allowed`,
      details: `Detected: ${fileType.mime}`,
    };
  }

  // Check MIME type matches extension
  const extension = getFileExtension(filename);
  const expectedMimes = getExpectedMimeTypes(extension);

  if (expectedMimes.length > 0 && !expectedMimes.includes(fileType.mime)) {
    return {
      type: 'MIME_MISMATCH',
      message: 'File extension does not match actual file type',
      details: `Extension: .${extension}, Detected: ${fileType.mime}`,
    };
  }

  return null;
}

/**
 * Get expected MIME types for file extension
 */
function getExpectedMimeTypes(extension: string): string[] {
  const mapping: Record<string, string[]> = {
    pdf: ['application/pdf'],
    png: ['image/png'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    json: ['application/json'],
    csv: ['text/csv'],
    yaml: ['application/x-yaml', 'text/yaml'],
    yml: ['application/x-yaml', 'text/yaml'],
    md: ['text/markdown', 'text/plain'],
  };

  return mapping[extension] || [];
}

/**
 * Validate complete file
 */
export async function validateFile(
  filename: string,
  buffer: Buffer
): Promise<{ valid: boolean; error?: FileValidationError }> {
  // Check extension
  const extError = validateFileExtension(filename);
  if (extError) {
    return { valid: false, error: extError };
  }

  // Check size
  const sizeError = validateFileSize(buffer.length);
  if (sizeError) {
    return { valid: false, error: sizeError };
  }

  // Check MIME type
  const mimeError = await validateMimeType(buffer, filename);
  if (mimeError) {
    return { valid: false, error: mimeError };
  }

  return { valid: true };
}

/**
 * Client-side file upload validation
 * Used by upload page components
 */

import { FILE_UPLOAD_LIMITS } from '@/lib/constants/ui';

export interface ClientFileValidationError {
  type: 'count' | 'size' | 'type';
  message: string;
}

export interface ClientFileValidationResult {
  valid: boolean;
  error?: ClientFileValidationError;
}

/**
 * Validates a batch of files for upload (client-side)
 * @param files - Array of File objects to validate
 * @returns Validation result with error details if invalid
 */
export function validateFileUpload(files: File[]): ClientFileValidationResult {
  // Validate file count
  if (files.length > FILE_UPLOAD_LIMITS.MAX_FILES) {
    return {
      valid: false,
      error: {
        type: 'count',
        message: `Maximum ${FILE_UPLOAD_LIMITS.MAX_FILES} files allowed per batch`,
      },
    };
  }

  // Validate total size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > FILE_UPLOAD_LIMITS.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        type: 'size',
        message: `Total size exceeds ${FILE_UPLOAD_LIMITS.MAX_SIZE_MB}MB limit`,
      },
    };
  }

  return { valid: true };
}

/**
 * Formats file size to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted size string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
