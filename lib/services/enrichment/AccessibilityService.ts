/**
 * Accessibility Service
 * Generates WCAG 2.1 AA accessibility requirements
 * Follows Single Responsibility Principle - accessibility only
 */

import type { LLMClient } from '@/lib/types/llm';
import type { EnrichmentSource, AccessibilityCategory } from '@/lib/types/enrichment';
import type { Feature } from './EnrichmentOrchestrator';
import { logger } from '@/lib/utils/logger';
import { randomUUID } from 'crypto';
import { callLLMForJson } from '@/lib/utils/llm-helpers';
import { AccessibilityPrompts } from '@/lib/prompts/enrichment/AccessibilityPrompts';
import { AccessibilityResponseSchema } from './schemas';

/**
 * WCAG requirements by feature category
 */
const WCAG_BY_CATEGORY: Record<AccessibilityCategory, string[]> = {
  media: [
    'Must provide captions for prerecorded video (WCAG 1.2.2 - Level A)',
    'Must provide audio descriptions for prerecorded video (WCAG 1.2.3 - Level A)',
    'Must provide captions for live video (WCAG 1.2.4 - Level AA)',
    'Must not auto-play audio that lasts more than 3 seconds (WCAG 1.4.2)',
    'Must allow keyboard control of all video functions (WCAG 2.1.1)',
    'Must not trap keyboard focus in video player (WCAG 2.1.2)',
  ],
  form: [
    'Must use programmatically determinable form labels (WCAG 1.3.1)',
    'Must have 4.5:1 contrast ratio for text (WCAG 1.4.3)',
    'Must be fully keyboard accessible (WCAG 2.1.1)',
    'Must have visible focus indicators (WCAG 2.4.7)',
    'Must not change context on focus (WCAG 3.2.1)',
    'Must provide error identification (WCAG 3.3.1)',
    'Must provide error suggestions (WCAG 3.3.3)',
  ],
  navigation: [
    'Must provide skip to main content link (WCAG 2.4.1)',
    'Must have descriptive page titles (WCAG 2.4.2)',
    'Must have logical focus order (WCAG 2.4.3)',
    'Must have clear link purpose (WCAG 2.4.4)',
    'Must have visible focus indicators (WCAG 2.4.7)',
    'Must be fully keyboard navigable (WCAG 2.1.1)',
  ],
  interactive: [
    'Must operate via keyboard (WCAG 2.1.1)',
    'Must have large enough touch targets (WCAG 2.5.5 - 44x44px minimum)',
    'Must not require specific pointer gestures (WCAG 2.5.1)',
    'Must have visible label matching accessible name (WCAG 2.5.3)',
  ],
  content: [
    'Must provide alt text for images (WCAG 1.1.1)',
    'Must use proper heading hierarchy (WCAG 1.3.1)',
    'Must have 4.5:1 contrast ratio for normal text (WCAG 1.4.3)',
    'Must allow text resize up to 200% (WCAG 1.4.4)',
  ],
  notification: [
    'Must announce notifications to screen readers (WCAG 4.1.3)',
    'Must not use color alone to convey information (WCAG 1.4.1)',
    'Must provide timeout warnings (WCAG 2.2.1)',
  ],
};

/**
 * Accessibility Service
 * Generates WCAG 2.1 AA requirements
 */
export class AccessibilityService {
  constructor(private llm: LLMClient) {}

  /**
   * Generate accessibility requirements for a feature
   */
  async generateRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id }, 'Generating accessibility requirements');

    const category = this.categorizeForAccessibility(feature);
    const baseRequirements = WCAG_BY_CATEGORY[category] || [];

    // Add feature-specific requirements via LLM
    const additionalRequirements = await this.generateFeatureSpecificWCAG(
      feature,
      category,
      baseRequirements
    );

    const allRequirements = [...baseRequirements, ...additionalRequirements];

    return allRequirements.map((content) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'wcag' as const,
      sourceName: 'WCAG 2.1 AA',
      sourceUrl: 'https://www.w3.org/WAI/WCAG21/quickref/',
      content,
      relevanceScore: 0.9,
      mandatory: false, // Advisory unless public-facing app
      fetchedAt: new Date(),
    }));
  }

  /**
   * Categorize feature for accessibility
   */
  private categorizeForAccessibility(feature: Feature): AccessibilityCategory {
    const content = feature.evidence.map((e) => e.content).join(' ').toLowerCase();

    if (content.includes('video') || content.includes('audio') || content.includes('playback')) {
      return 'media';
    }

    if (content.includes('form') || content.includes('input') || content.includes('login')) {
      return 'form';
    }

    if (content.includes('menu') || content.includes('navigation') || content.includes('tab')) {
      return 'navigation';
    }

    if (content.includes('button') || content.includes('slider') || content.includes('control')) {
      return 'interactive';
    }

    if (content.includes('alert') || content.includes('notification') || content.includes('toast')) {
      return 'notification';
    }

    return 'content'; // Default
  }

  /**
   * Generate feature-specific WCAG requirements using LLM
   */
  private async generateFeatureSpecificWCAG(
    feature: Feature,
    category: AccessibilityCategory,
    baseRequirements: string[]
  ): Promise<string[]> {
    const prompt = AccessibilityPrompts.featureSpecificWCAG(feature, category, baseRequirements);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      AccessibilityResponseSchema,
      { temperature: 0.3, maxTokens: 1500 }
    );

    if (!result) {
      logger.error('Failed to generate feature-specific WCAG requirements');
      return [];
    }

    return result.requirements || [];
  }
}
