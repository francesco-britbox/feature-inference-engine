/**
 * Platform Guideline Service
 * Generates platform-specific requirements (iOS HIG, Android Material, App Store)
 * Uses LLM knowledge base instead of web scraping (no external dependencies)
 * Follows Single Responsibility Principle - platform guidelines only
 */

import type { LLMClient } from '@/lib/types/llm';
import type { EnrichmentSource } from '@/lib/types/enrichment';
import type { Feature } from './EnrichmentOrchestrator';
import { logger } from '@/lib/utils/logger';
import { randomUUID } from 'crypto';
import { callLLMForJson } from '@/lib/utils/llm-helpers';
import { PlatformGuidelinePrompts } from '@/lib/prompts/enrichment/PlatformGuidelinePrompts';
import { PlatformGuidelinesResponseSchema } from './schemas';

/**
 * Platform Guideline Service
 * Generates iOS, Android, and App Store requirements using LLM
 */
export class PlatformGuidelineService {
  constructor(private llm: LLMClient) {}

  /**
   * Fetch iOS Human Interface Guidelines
   * Uses LLM knowledge of iOS HIG instead of web scraping
   */
  async fetchIOSGuidelines(feature: Feature): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id }, 'Fetching iOS guidelines');

    const prompt = PlatformGuidelinePrompts.ios(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      PlatformGuidelinesResponseSchema,
      { temperature: 0.2, maxTokens: 2000 }
    );

    if (!result) {
      logger.error('Failed to fetch iOS guidelines');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'ios_hig' as const,
      sourceName: 'iOS Human Interface Guidelines',
      sourceUrl: 'https://developer.apple.com/design/human-interface-guidelines/',
      content: req.content,
      relevanceScore: req.relevance_score,
      mandatory: req.mandatory,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Fetch Android Material Design Guidelines
   * Uses LLM knowledge of Material Design instead of web scraping
   */
  async fetchAndroidGuidelines(feature: Feature): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id }, 'Fetching Android guidelines');

    const prompt = PlatformGuidelinePrompts.android(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      PlatformGuidelinesResponseSchema,
      { temperature: 0.2, maxTokens: 2000 }
    );

    if (!result) {
      logger.error('Failed to fetch Android guidelines');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'android_material' as const,
      sourceName: 'Material Design Guidelines',
      sourceUrl: 'https://m3.material.io/',
      content: req.content,
      relevanceScore: req.relevance_score,
      mandatory: req.mandatory,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Fetch App Store Certification Requirements
   * Uses LLM knowledge of App Store Review Guidelines
   */
  async fetchAppStoreRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id }, 'Fetching App Store requirements');

    const prompt = PlatformGuidelinePrompts.appStore(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      PlatformGuidelinesResponseSchema,
      { temperature: 0.1, maxTokens: 2000 }
    );

    if (!result) {
      logger.error('Failed to fetch App Store requirements');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'apple_store' as const,
      sourceName: 'Apple App Store Review Guidelines',
      sourceUrl: 'https://developer.apple.com/app-store/review/guidelines/',
      content: req.content,
      relevanceScore: req.relevance_score,
      mandatory: req.mandatory,
      fetchedAt: new Date(),
      metadata: {
        rejectionRisk: req.rejection_risk,
      },
    }));
  }

  /**
   * Fetch Google Play Policy Requirements
   * Uses LLM knowledge of Google Play policies
   */
  async fetchGooglePlayRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id }, 'Fetching Google Play requirements');

    const prompt = PlatformGuidelinePrompts.googlePlay(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      PlatformGuidelinesResponseSchema,
      { temperature: 0.1, maxTokens: 2000 }
    );

    if (!result) {
      logger.error('Failed to fetch Google Play requirements');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'google_play' as const,
      sourceName: 'Google Play Policies',
      sourceUrl: 'https://support.google.com/googleplay/android-developer/answer/9859455',
      content: req.content,
      relevanceScore: req.relevance_score,
      mandatory: req.mandatory,
      fetchedAt: new Date(),
    }));
  }
}
