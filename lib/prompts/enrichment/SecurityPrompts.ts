/**
 * Security Prompts
 * Template prompts for security requirement generation
 * Follows DRY principle - single source of truth for security prompts
 */

import type { Feature } from '@/lib/services/enrichment/EnrichmentOrchestrator';
import type { SecurityCategory } from '@/lib/types/enrichment';

/**
 * Security Prompts
 * Contains all prompt templates for security
 */
export class SecurityPrompts {
  /**
   * OWASP prioritization prompt
   */
  static prioritizeOWASP(
    feature: Feature,
    requirements: string[],
    categories: SecurityCategory[]
  ): string {
    return `Prioritize OWASP security requirements for: "${feature.name}"

Security categories: ${categories.join(', ')}
Feature description: ${feature.description}

Requirements:
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Prioritize into:
- Critical: MUST have (app-breaking vulnerabilities)
- High: SHOULD have (significant risk)
- Medium: NICE to have (defense in depth)

Also generate 1-2 additional feature-specific security requirements.

Return JSON:
{
  "critical": [1, 2, 5],
  "high": [3, 7],
  "medium": [9, 12],
  "additional": [
    "Must implement Content Security Policy (CSP) headers",
    "Must validate JWT token expiration"
  ]
}`;
  }
}
