/**
 * Enrichment types for Phase 9
 * External requirements from platform guidelines, legal, accessibility, security
 */

/**
 * Enrichment source type
 */
export type EnrichmentSourceType =
  | 'ios_hig'
  | 'android_material'
  | 'apple_store'
  | 'google_play'
  | 'wcag'
  | 'owasp'
  | 'gdpr'
  | 'ccpa'
  | 'edge_case'
  | 'legal'
  | 'other';

/**
 * Enrichment status lifecycle
 */
export type EnrichmentStatus = 'pending' | 'enriching' | 'completed' | 'failed' | 'skipped';

/**
 * Enrichment source from external guidelines
 */
export interface EnrichmentSource {
  id: string;
  featureId: string;
  sourceType: EnrichmentSourceType;
  sourceName: string;
  sourceUrl?: string;
  content: string;
  relevanceScore: number;
  mandatory: boolean;
  fetchedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Enrichment options for triggering enrichment
 */
export interface EnrichmentOptions {
  sources: EnrichmentSourceType[];
  includeAppStore?: boolean;
  targetMarkets?: string[];
  edgeCaseLimit?: number;
}

/**
 * Enrichment result summary
 */
export interface EnrichmentResult {
  success: boolean;
  sourcesCount: number;
  sources: EnrichmentSource[];
  summary?: {
    totalSources: number;
    byType: Record<EnrichmentSourceType, number>;
    mandatoryCount: number;
  };
}

/**
 * Edge case priority
 */
export type EdgeCasePriority = 'high' | 'medium' | 'low';

/**
 * Edge case category
 */
export type EdgeCaseCategory = 'network' | 'device' | 'user' | 'content' | 'security' | 'platform';

/**
 * Edge case from GitHub, Stack Overflow, or LLM
 */
export interface EdgeCase {
  scenario: string;
  expected_behavior: string;
  test_case: string;
  priority: EdgeCasePriority;
  category: EdgeCaseCategory;
  sources?: string[];
}

/**
 * Edge case candidate from external sources
 */
export interface EdgeCaseCandidate {
  scenario: string;
  description: string;
  solution?: string;
  source: string;
  sourceUrl?: string;
  frequency: number;
}

/**
 * Accessibility category for WCAG mapping
 */
export type AccessibilityCategory =
  | 'media'
  | 'form'
  | 'navigation'
  | 'interactive'
  | 'content'
  | 'notification';

/**
 * Security category for OWASP mapping
 */
export type SecurityCategory =
  | 'authentication'
  | 'data-input'
  | 'api'
  | 'payment'
  | 'data-storage';

/**
 * Data types detected in feature
 */
export interface DataTypes {
  personal: boolean;
  payment: boolean;
  health: boolean;
  location: boolean;
  biometric: boolean;
  children: boolean;
  media: boolean;
}
