/**
 * File Upload API
 * Handles batch uploads with per-file validation and transactions
 * POST /api/upload - Upload multiple files
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents, processingJobs } from '@/lib/db/schema';
import { storageService } from '@/lib/services/StorageService';
import { queueService } from '@/lib/services/QueueService';
import {
  calculateFileHash,
  validateFile,
} from '@/lib/utils/fileValidation';
import { AppError, DuplicateFileError } from '@/lib/utils/errors';
import type { UploadResult } from '@/lib/types/upload';
import type { DocumentMetadata } from '@/lib/types/document';
import { activityLogService } from '@/lib/services/ActivityLogService';

/**
 * Batch upload limits from environment
 */
const MAX_FILES_PER_BATCH = parseInt(
  process.env.MAX_FILES_PER_BATCH || '20',
  10
);
const MAX_BATCH_SIZE_MB = parseInt(
  process.env.MAX_BATCH_SIZE_MB || '500',
  10
);
const MAX_BATCH_SIZE_BYTES = MAX_BATCH_SIZE_MB * 1024 * 1024;

/**
 * POST /api/upload
 * Upload multiple files with validation and per-file transactions
 */
export async function POST(request: Request): Promise<NextResponse<UploadResult>> {
  const result: UploadResult = {
    successes: [],
    failures: [],
  };

  try {
    // Validate OpenAI API key early (fail fast)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          successes: [],
          failures: [{
            filename: 'system',
            error: 'OPENAI_API_KEY not configured',
            details: 'Server configuration error',
          }],
        },
        { status: 503 }
      );
    }

    // Ensure storage directory exists
    await storageService.ensureStorageDirectory();

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        {
          successes: [],
          failures: [{
            filename: 'request',
            error: 'No files provided',
            details: 'Upload at least one file',
          }],
        },
        { status: 400 }
      );
    }

    // Validate batch limits
    if (files.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json(
        {
          successes: [],
          failures: [{
            filename: 'batch',
            error: 'Too many files',
            details: `Maximum ${MAX_FILES_PER_BATCH} files per batch`,
          }],
        },
        { status: 400 }
      );
    }

    // Calculate total batch size
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > MAX_BATCH_SIZE_BYTES) {
      return NextResponse.json(
        {
          successes: [],
          failures: [{
            filename: 'batch',
            error: 'Batch too large',
            details: `Total size ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds maximum ${MAX_BATCH_SIZE_MB}MB`,
          }],
        },
        { status: 400 }
      );
    }

    // Process each file independently
    for (const file of files) {
      try {
        await processFile(file, result);
      } catch (error) {
        // Catch any unhandled errors and add to failures
        result.failures.push({
          filename: file.name,
          error: 'Unexpected error',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Return results (partial success allowed)
    const statusCode = result.successes.length > 0 ? 200 : 400;
    return NextResponse.json(result, { status: statusCode });

  } catch (error) {
    // Handle request-level errors
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          successes: [],
          failures: [{
            filename: 'request',
            error: error.message,
            details: error.code,
          }],
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        successes: [],
        failures: [{
          filename: 'request',
          error: 'Internal server error',
          details: error instanceof Error ? error.message : String(error),
        }],
      },
      { status: 500 }
    );
  }
}

/**
 * Process a single file with per-file transaction
 */
async function processFile(
  file: File,
  result: UploadResult
): Promise<void> {
  const filename = file.name;

  try {
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file
    const validation = await validateFile(filename, buffer);
    if (!validation.valid) {
      result.failures.push({
        filename,
        error: validation.error!.message,
        details: validation.error!.details,
      });
      return;
    }

    // Calculate file hash
    const fileHash = calculateFileHash(buffer);

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(documents)
      .where(eq(documents.fileHash, fileHash));

    if (existing) {
      // Check if already being processed
      const [existingJob] = await db
        .select()
        .from(processingJobs)
        .where(eq(processingJobs.documentId, existing.id));

      if (existingJob && existingJob.status === 'processing') {
        result.failures.push({
          filename,
          error: 'File upload failed: This file has already been uploaded and is currently being processed',
          details: `This exact file (based on content hash) already exists in the system. Document ID: ${existing.id}. The file is currently being processed. Please wait for processing to complete or view it in the Documents page.`,
        });
        return;
      }

      result.failures.push({
        filename,
        error: 'File upload failed: This file has already been uploaded',
        details: `This exact file (based on content hash) already exists in the system. Document ID: ${existing.id}. If you need to re-process this file, please delete it first from the Documents page, or view the existing evidence that was extracted from it.`,
      });
      return;
    }

    // Create metadata
    const metadata: DocumentMetadata = {
      originalName: filename,
      sizeBytes: buffer.length,
      mimeType: file.type,
    };

    // Save file (per-file transaction)
    const { documentId } = await storageService.saveFile(
      buffer,
      filename,
      fileHash,
      metadata
    );

    // Create processing job
    await queueService.createJob(documentId, 'extract');

    // Log upload success
    activityLogService.addLog('success', `📤 Uploaded: ${filename}`, { documentId });

    // Add to successes
    result.successes.push({
      id: documentId,
      filename,
      fileHash,
    });

  } catch (error) {
    if (error instanceof DuplicateFileError) {
      result.failures.push({
        filename,
        error: 'Duplicate file',
        details: error.existingDocumentId,
      });
    } else if (error instanceof AppError) {
      result.failures.push({
        filename,
        error: error.message,
        details: error.code,
      });
    } else {
      result.failures.push({
        filename,
        error: 'Upload failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
