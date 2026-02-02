/**
 * Document API Client
 * Centralized API calls for document operations
 */

export interface UploadSuccess {
  id: string;
  filename: string;
}

export interface UploadFailure {
  filename: string;
  error: string;
  details?: string;
}

export interface UploadResult {
  successes: UploadSuccess[];
  failures: UploadFailure[];
}

/**
 * Uploads multiple files to the server
 * @param files - Array of File objects to upload
 * @returns Upload result with successes and failures
 * @throws Error if upload request fails
 */
export async function uploadFiles(files: File[]): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error || 'Upload failed');
  }

  return await response.json();
}

/**
 * Fetches document status by ID
 * @param documentId - Document ID
 * @returns Document status or null if not found
 */
export async function fetchDocumentStatus(documentId: string): Promise<{
  status: string;
  progress: { message: string };
} | null> {
  try {
    const response = await fetch(`/api/documents/${documentId}/status`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}
