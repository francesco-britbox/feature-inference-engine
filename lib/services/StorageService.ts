/**
 * StorageService
 * Handles file storage to disk and metadata to database
 * Single Responsibility: File persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { StorageError } from '@/lib/utils/errors';
import { mapExtensionToFileType, getFileExtension } from '@/lib/utils/fileValidation';
import type { DocumentMetadata } from '@/lib/types/document';

/**
 * Base directory for document storage
 */
const DOCS_BASE_DIR = path.join(process.cwd(), 'app', 'docs');

export class StorageService {
  /**
   * Save file to disk and create database record
   * @param buffer File buffer
   * @param filename Original filename
   * @param fileHash SHA-256 hash
   * @param metadata File metadata
   * @returns Document ID and file path
   */
  async saveFile(
    buffer: Buffer,
    filename: string,
    fileHash: string,
    metadata: DocumentMetadata
  ): Promise<{ documentId: string; filePath: string }> {
    try {
      // Insert document record first to get UUID
      const [document] = await db
        .insert(documents)
        .values({
          filename,
          fileType: mapExtensionToFileType(getFileExtension(filename)),
          filePath: '', // Will update after saving to disk
          fileHash,
          status: 'uploaded',
          metadata: metadata as unknown as typeof documents.$inferInsert.metadata,
        })
        .returning();

      if (!document) {
        throw new StorageError('Failed to create document record');
      }

      // Create document directory
      const documentDir = path.join(DOCS_BASE_DIR, document.id);
      await fs.mkdir(documentDir, { recursive: true });

      // Save file with original extension
      const extension = getFileExtension(filename);
      const filePath = path.join(documentDir, `original.${extension}`);

      await fs.writeFile(filePath, buffer);

      // Update document with file path
      await db
        .update(documents)
        .set({ filePath })
        .where(eq(documents.id, document.id));

      return {
        documentId: document.id,
        filePath,
      };
    } catch (error) {
      throw new StorageError(
        `Failed to save file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete file and document record
   * @param documentId Document UUID
   */
  async deleteFile(documentId: string): Promise<void> {
    try {
      // Get document to find file path
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));

      if (document && document.filePath) {
        // Delete file from disk
        const documentDir = path.dirname(document.filePath);
        await fs.rm(documentDir, { recursive: true, force: true });
      }

      // Delete database record (cascade will delete processing_jobs)
      await db.delete(documents).where(eq(documents.id, documentId));
    } catch (error) {
      throw new StorageError(
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if directory exists and is writable
   */
  async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(DOCS_BASE_DIR, fs.constants.W_OK);
    } catch {
      await fs.mkdir(DOCS_BASE_DIR, { recursive: true });
    }
  }
}

/**
 * Singleton instance
 */
export const storageService = new StorageService();
