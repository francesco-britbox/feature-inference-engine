/**
 * Accessibility Prompts
 * Template prompts for accessibility requirement generation
 * Follows DRY principle - single source of truth for accessibility prompts
 */

import type { Feature } from '@/lib/services/enrichment/EnrichmentOrchestrator';
import type { AccessibilityCategory } from '@/lib/types/enrichment';

/**
 * Accessibility Prompts
 * Contains all prompt templates for accessibility
 */
export class AccessibilityPrompts {
  /**
   * Feature-specific WCAG requirements prompt
   */
  static featureSpecificWCAG(
    feature: Feature,
    category: AccessibilityCategory,
    baseRequirements: string[]
  ): string {
    return `Generate additional WCAG 2.1 AA accessibility requirements for: "${feature.name}"

Feature category: ${category}
Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map((e) => e.content).join(', ')}

Base requirements already covered:
${baseRequirements.join('\n')}

Generate 2-4 additional specific WCAG requirements that are not already covered.

Focus on:
- Screen reader announcements
- Keyboard shortcuts
- Focus management
- ARIA labels
- Responsive text sizing

Return JSON:
{
  "requirements": [
    "Must provide keyboard shortcut legend accessible via '?' key",
    "Must announce video quality changes to screen readers"
  ]
}`;
  }
}
