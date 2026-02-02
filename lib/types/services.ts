/**
 * Service Interface Definitions
 * Follows DIP: High-level interfaces for dependency injection
 * Follows ISP: Small, focused interfaces - services depend only on what they need
 */

/**
 * IExtractionService
 * Interface for document extraction services
 * Allows dependency injection and mocking for testing
 */
export interface IExtractionService {
  /**
   * Extract evidence from a document
   * @param documentId - Document UUID
   * @returns Number of evidence items extracted
   */
  extractFromDocument(documentId: string): Promise<number>;

  /**
   * Batch extract evidence from multiple documents
   * @param documentIds - Array of document UUIDs
   * @returns Map of document ID to evidence count
   */
  batchExtract(documentIds: string[]): Promise<Map<string, number>>;
}

/**
 * IFeatureInferenceService
 * Interface for feature inference services
 * Allows dependency injection and mocking for testing
 */
export interface IFeatureInferenceService {
  /**
   * Generate feature hypothesis from evidence cluster
   * @param evidenceItems - Evidence items in the cluster
   * @returns Generated feature ID
   */
  generateFeatureFromCluster(evidenceItems: Array<{
    id: string;
    content: string;
    type: string;
  }>): Promise<string>;

  /**
   * Cross-cluster validation: compare features and merge duplicates
   * @returns Number of features merged
   */
  validateAndMergeDuplicates(): Promise<number>;
}

/**
 * IConfidenceScorer
 * Interface for confidence scoring services
 * Allows dependency injection and mocking for testing
 */
export interface IConfidenceScorer {
  /**
   * Calculate confidence score for a single feature
   * @param featureId - Feature ID to score
   * @returns Confidence calculation result
   */
  calculateConfidenceForFeature(featureId: string): Promise<{
    featureId: string;
    confidenceScore: number;
    status: 'candidate' | 'confirmed' | 'rejected';
    evidenceCount: number;
    signalWeights: Record<string, number>;
  }>;

  /**
   * Calculate confidence scores for all candidate features
   * @returns Array of confidence calculation results
   */
  calculateConfidenceForAllFeatures(): Promise<Array<{
    featureId: string;
    confidenceScore: number;
    status: 'candidate' | 'confirmed' | 'rejected';
    evidenceCount: number;
    signalWeights: Record<string, number>;
  }>>;

  /**
   * Recalculate confidence for a feature when evidence is added or removed
   * @param featureId - Feature ID to recalculate
   * @returns Updated confidence result
   */
  recalculateConfidence(featureId: string): Promise<{
    featureId: string;
    confidenceScore: number;
    status: 'candidate' | 'confirmed' | 'rejected';
    evidenceCount: number;
    signalWeights: Record<string, number>;
  }>;

  /**
   * Get current confidence breakdown for a feature
   * @param featureId - Feature ID to analyze
   * @returns Confidence breakdown with evidence details
   */
  getConfidenceBreakdown(featureId: string): Promise<{
    confidenceScore: number;
    status: string;
    evidenceBreakdown: Array<{
      type: string;
      count: number;
      weight: number;
      contribution: number;
    }>;
  }>;
}
