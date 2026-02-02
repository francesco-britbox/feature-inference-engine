/**
 * Legal Compliance Service
 * Generates legal and compliance requirements (GDPR, CCPA, copyright, age restrictions)
 * Follows Single Responsibility Principle - legal compliance only
 */

import type { LLMClient } from '@/lib/types/llm';
import type { EnrichmentSource, DataTypes } from '@/lib/types/enrichment';
import type { Feature } from './EnrichmentOrchestrator';
import { logger } from '@/lib/utils/logger';
import { randomUUID } from 'crypto';
import { callLLMForJson } from '@/lib/utils/llm-helpers';
import { LegalCompliancePrompts } from '@/lib/prompts/enrichment/LegalCompliancePrompts';
import { LegalComplianceResponseSchema } from './schemas';

/**
 * Legal Compliance Options
 */
export interface LegalComplianceOptions {
  targetMarkets: string[];
}

/**
 * Legal Compliance Service
 * Assesses and generates legal requirements
 */
export class LegalComplianceService {
  constructor(private llm: LLMClient) {}

  /**
   * Assess compliance and generate requirements
   * Entry point for all legal compliance checks
   */
  async assessCompliance(
    feature: Feature,
    options: LegalComplianceOptions
  ): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id, markets: options.targetMarkets }, 'Assessing compliance');

    const dataTypes = this.detectDataTypes(feature);
    const sources: EnrichmentSource[] = [];

    // 1. GDPR (if EU market + personal data)
    if (options.targetMarkets.includes('EU') && dataTypes.personal) {
      sources.push(...(await this.generateGDPRRequirements(feature, dataTypes)));
    }

    // 2. CCPA (if US market + personal data)
    if (options.targetMarkets.includes('US') && dataTypes.personal) {
      sources.push(...(await this.generateCCPARequirements(feature)));
    }

    // 3. COPPA (if children data)
    if (dataTypes.children) {
      sources.push(...(await this.generateCOPPARequirements(feature)));
    }

    // 4. PCI-DSS (if payment data)
    if (dataTypes.payment) {
      sources.push(...(await this.generatePCIDSSRequirements(feature)));
    }

    // 5. Copyright (if media content)
    if (dataTypes.media) {
      sources.push(...(await this.generateCopyrightRequirements(feature)));
    }

    // 6. Age restrictions (if media/social)
    if (dataTypes.media || this.isSocialFeature(feature)) {
      sources.push(...(await this.generateAgeRestrictions(feature)));
    }

    return sources;
  }

  /**
   * Detect data types in feature
   * Used to determine which legal requirements apply
   */
  private detectDataTypes(feature: Feature): DataTypes {
    const evidenceText = feature.evidence
      .map((e) => e.content)
      .join(' ')
      .toLowerCase();

    return {
      personal: /email|name|address|phone|birth|profile/.test(evidenceText),
      payment: /payment|credit|billing|subscription|purchase/.test(evidenceText),
      health: /medical|health|fitness|workout/.test(evidenceText),
      location: /location|gps|geo|map/.test(evidenceText),
      biometric: /fingerprint|face.?id|biometric|touch.?id/.test(evidenceText),
      children: /child|kid|under.?13|coppa/.test(evidenceText),
      media: /video|audio|stream|playback|content/.test(evidenceText),
    };
  }

  /**
   * Generate GDPR requirements
   */
  private async generateGDPRRequirements(
    feature: Feature,
    dataTypes: DataTypes
  ): Promise<EnrichmentSource[]> {
    const prompt = LegalCompliancePrompts.gdpr(feature, dataTypes);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      LegalComplianceResponseSchema,
      { temperature: 0.1, maxTokens: 2000 }
    );

    if (!result) {
      logger.error('Failed to generate GDPR requirements');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'gdpr' as const,
      sourceName: `GDPR Article ${req.article || 'General'}`,
      sourceUrl: 'https://gdpr.eu/checklist/',
      content: req.content,
      relevanceScore: 1.0,
      mandatory: true, // GDPR is legally mandatory
      fetchedAt: new Date(),
    }));
  }

  /**
   * Generate CCPA requirements
   */
  private async generateCCPARequirements(feature: Feature): Promise<EnrichmentSource[]> {
    const prompt = LegalCompliancePrompts.ccpa(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      LegalComplianceResponseSchema,
      { temperature: 0.1, maxTokens: 1500 }
    );

    if (!result) {
      logger.error('Failed to generate CCPA requirements');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'ccpa' as const,
      sourceName: 'CCPA Compliance',
      sourceUrl: 'https://oag.ca.gov/privacy/ccpa',
      content: req.content,
      relevanceScore: 1.0,
      mandatory: true,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Generate COPPA requirements (children under 13)
   */
  private async generateCOPPARequirements(feature: Feature): Promise<EnrichmentSource[]> {
    const prompt = LegalCompliancePrompts.coppa(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      LegalComplianceResponseSchema,
      { temperature: 0.1, maxTokens: 1500 }
    );

    if (!result) {
      logger.error('Failed to generate COPPA requirements');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'legal' as const,
      sourceName: 'COPPA Compliance',
      sourceUrl: 'https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/childrens-online-privacy-protection-rule',
      content: req.content,
      relevanceScore: 1.0,
      mandatory: true,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Generate PCI-DSS requirements (payment data)
   */
  private async generatePCIDSSRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    const standardRequirements = [
      'Must not store full credit card numbers (only last 4 digits)',
      'Must not store CVV/CVC security codes',
      'Must encrypt cardholder data at rest and in transit',
      'Must use TLS 1.2+ for payment processing',
      'Must tokenize payment methods (use payment gateway like Stripe/PayPal)',
      'Must implement strong access controls for payment data',
      'Must maintain audit logs for all payment transactions',
      'Must use a certified payment processor',
    ];

    return standardRequirements.map((content) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'legal' as const,
      sourceName: 'PCI-DSS Compliance',
      sourceUrl: 'https://www.pcisecuritystandards.org/',
      content,
      relevanceScore: 1.0,
      mandatory: true,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Generate copyright requirements
   */
  private async generateCopyrightRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    const prompt = LegalCompliancePrompts.copyright(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      LegalComplianceResponseSchema,
      { temperature: 0.2, maxTokens: 1500 }
    );

    if (!result) {
      logger.error('Failed to generate copyright requirements');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'legal' as const,
      sourceName: 'Copyright Compliance',
      sourceUrl: 'https://www.copyright.gov/',
      content: req.content,
      relevanceScore: 0.9,
      mandatory: true,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Generate age restriction requirements
   */
  private async generateAgeRestrictions(feature: Feature): Promise<EnrichmentSource[]> {
    const prompt = LegalCompliancePrompts.ageRestrictions(feature);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      LegalComplianceResponseSchema,
      { temperature: 0.2, maxTokens: 1500 }
    );

    if (!result) {
      logger.error('Failed to generate age restrictions');
      return [];
    }

    return result.requirements.map((req) => ({
      id: randomUUID(),
      featureId: feature.id,
      sourceType: 'legal' as const,
      sourceName: 'Age Restrictions & Content Rating',
      content: req.content,
      relevanceScore: 0.85,
      mandatory: req.mandatory,
      fetchedAt: new Date(),
    }));
  }

  /**
   * Check if feature is social (has user interaction)
   */
  private isSocialFeature(feature: Feature): boolean {
    const socialKeywords = ['comment', 'share', 'like', 'follow', 'message', 'chat', 'post'];
    const featureText = `${feature.name} ${feature.description}`.toLowerCase();

    return socialKeywords.some((kw) => featureText.includes(kw));
  }
}
