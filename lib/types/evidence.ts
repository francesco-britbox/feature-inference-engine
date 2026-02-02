/**
 * Evidence types and interfaces
 */

export type EvidenceType =
  | 'ui_element'
  | 'flow'
  | 'endpoint'
  | 'payload'
  | 'requirement'
  | 'edge_case'
  | 'acceptance_criteria'
  | 'bug'
  | 'constraint';

export interface Evidence {
  id?: string;
  documentId: string;
  type: EvidenceType;
  content: string;
  rawData?: Record<string, unknown>;
  embedding?: number[];
  extractedAt?: Date;
}

export interface ExtractedEvidence {
  type: EvidenceType;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base interface for all extractors
 * Follows Interface Segregation Principle
 */
export interface Extractor {
  /**
   * Extract evidence from a document file
   * @param filePath Absolute path to document file
   * @param documentId Document UUID for linking evidence
   * @returns Array of extracted evidence
   */
  extract(filePath: string, documentId: string): Promise<Evidence[]>;
}
