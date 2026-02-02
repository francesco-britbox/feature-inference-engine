/**
 * Feature types and interfaces
 */

export type FeatureStatus = 'candidate' | 'confirmed' | 'rejected';

export type RelationshipType = 'implements' | 'supports' | 'constrains' | 'extends';

export interface Feature {
  id: string;
  name: string;
  description?: string | null;
  confidenceScore?: number | string; // API returns string, services use number
  status: FeatureStatus | string; // API may return raw string
  inferredAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureHypothesis {
  name: string;
  description: string;
  confidence: number;
  reasoning: string;
  evidenceIds: string[];
}

export interface FeatureRelationship {
  featureId: string;
  evidenceId: string;
  relationshipType: RelationshipType;
  strength: number;
  reasoning?: string;
}

export interface Signal {
  type: string;
  weight: number;
}

/**
 * Signal weights for confidence calculation
 * Based on evidence type reliability
 */
export const SIGNAL_WEIGHTS: Record<string, number> = {
  endpoint: 0.4, // API endpoints are strong signals
  ui_element: 0.3, // UI elements are moderate signals
  payload: 0.35, // Request/response schemas are strong
  requirement: 0.25, // Explicit requirements are moderate
  acceptance_criteria: 0.3, // Testable criteria are moderate-strong
  flow: 0.2, // User flows are moderate-weak
  edge_case: 0.15, // Edge cases are supporting evidence
  bug: 0.2, // Bugs indicate features exist
  constraint: 0.15, // Constraints are supporting evidence
};
