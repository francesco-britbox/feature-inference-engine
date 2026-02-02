/**
 * Enrichment Service Response Schemas
 * Zod schemas for validating LLM JSON responses
 * Follows type safety principle - validate all external data
 */

import { z } from 'zod';

/**
 * Platform Guideline Requirement Schema
 */
export const PlatformRequirementSchema = z.object({
  content: z.string(),
  relevance_score: z.number().min(0).max(1),
  mandatory: z.boolean(),
  reasoning: z.string().optional(),
  rejection_risk: z.string().optional(),
});

/**
 * Platform Guidelines Response Schema
 */
export const PlatformGuidelinesResponseSchema = z.object({
  requirements: z.array(PlatformRequirementSchema),
});

/**
 * Legal Requirement Schema
 */
export const LegalRequirementSchema = z.object({
  content: z.string(),
  article: z.string().optional(),
  mandatory: z.boolean(),
});

/**
 * Legal Compliance Response Schema
 */
export const LegalComplianceResponseSchema = z.object({
  requirements: z.array(LegalRequirementSchema),
});

/**
 * Accessibility Requirements Response Schema
 */
export const AccessibilityResponseSchema = z.object({
  requirements: z.array(z.string()),
});

/**
 * Security Prioritization Response Schema
 */
export const SecurityPrioritizationSchema = z.object({
  critical: z.array(z.number()).optional(),
  high: z.array(z.number()).optional(),
  medium: z.array(z.number()).optional(),
  additional: z.array(z.string()).optional(),
});

/**
 * Edge Case Schema
 */
export const EdgeCaseSchema = z.object({
  scenario: z.string(),
  expected_behavior: z.string(),
  test_case: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['network', 'device', 'user', 'content', 'security', 'platform']),
});

/**
 * Edge Cases Response Schema
 */
export const EdgeCasesResponseSchema = z.object({
  edge_cases: z.array(EdgeCaseSchema),
});

// Export types derived from schemas
export type PlatformRequirement = z.infer<typeof PlatformRequirementSchema>;
export type PlatformGuidelinesResponse = z.infer<typeof PlatformGuidelinesResponseSchema>;
export type LegalRequirement = z.infer<typeof LegalRequirementSchema>;
export type LegalComplianceResponse = z.infer<typeof LegalComplianceResponseSchema>;
export type AccessibilityResponse = z.infer<typeof AccessibilityResponseSchema>;
export type SecurityPrioritization = z.infer<typeof SecurityPrioritizationSchema>;
export type EdgeCaseResponse = z.infer<typeof EdgeCasesResponseSchema>;
