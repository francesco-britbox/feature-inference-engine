/**
 * Document Status Hook
 * Manages fetching and polling document processing status
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './useToast';

export interface DocumentProgress {
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  message: string;
}

export interface DocumentStatus {
  id: string;
  filename: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: DocumentProgress;
}

/**
 * Fetches document status from API
 * @param documentId - Document ID to fetch
 * @returns Document status or null if error
 */
async function fetchDocumentStatusFromApi(documentId: string): Promise<DocumentStatus | null> {
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

/**
 * Hook for managing document status with polling
 * @param documentIds - Array of document IDs to monitor
 * @param pollingInterval - Polling interval in milliseconds (default: 2000)
 * @returns Object with status map and refresh function
 */
export function useDocumentStatus(
  documentIds: string[],
  pollingInterval: number = 2000
): {
  statusMap: Map<string, DocumentStatus>;
  refresh: (documentId: string) => Promise<void>;
} {
  const [statusMap, setStatusMap] = useState<Map<string, DocumentStatus>>(new Map());
  const { toast } = useToast();

  const refresh = useCallback(
    async (documentId: string): Promise<void> => {
      const status = await fetchDocumentStatusFromApi(documentId);
      if (status) {
        setStatusMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(documentId, status);
          return newMap;
        });
      }
    },
    []
  );

  useEffect(() => {
    // Filter documents that need polling (uploaded or processing)
    const docsToMonitor = documentIds.filter((id) => {
      const status = statusMap.get(id);
      return status && (status.status === 'uploaded' || status.status === 'processing');
    });

    if (docsToMonitor.length === 0) {
      return;
    }

    // Poll all documents that need monitoring
    const interval = setInterval(() => {
      docsToMonitor.forEach((id) => {
        refresh(id).catch(() => {
          toast.error(`Failed to fetch status for document ${id}`);
        });
      });
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [documentIds, statusMap, pollingInterval, refresh, toast]);

  return { statusMap, refresh };
}
