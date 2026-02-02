/**
 * Security Service
 * Generates OWASP Top 10 security requirements
 * Follows Single Responsibility Principle - security only
 */

import type { LLMClient } from '@/lib/types/llm';
import type { EnrichmentSource, SecurityCategory } from '@/lib/types/enrichment';
import type { Feature } from './EnrichmentOrchestrator';
import { logger } from '@/lib/utils/logger';
import { randomUUID } from 'crypto';
import { callLLMForJson } from '@/lib/utils/llm-helpers';
import { SecurityPrompts } from '@/lib/prompts/enrichment/SecurityPrompts';
import { SecurityPrioritizationSchema } from './schemas';

/**
 * OWASP Top 10 requirements by security category
 */
const OWASP_BY_CATEGORY: Record<SecurityCategory, string[]> = {
  authentication: [
    'Must enforce authentication before accessing protected resources (OWASP A01)',
    'Must hash passwords with bcrypt/argon2 (cost factor ≥12) (OWASP A02)',
    'Must never store passwords in plain text (OWASP A02)',
    'Must use HTTPS only (no HTTP) (OWASP A02)',
    'Must encrypt sensitive data at rest (OWASP A02)',
    'Must use parameterized queries to prevent SQL injection (OWASP A03)',
    'Must implement rate limiting (5 attempts per 15 minutes) (OWASP A04)',
    'Must implement account lockout after failed attempts (OWASP A04)',
    'Must use secure session tokens (cryptographically random) (OWASP A04)',
    'Must implement session timeout (30 minutes inactivity) (OWASP A04)',
  ],
  'data-input': [
    'Must validate all user inputs (XSS prevention) (OWASP A03)',
    'Must sanitize HTML inputs (OWASP A03)',
    'Must use parameterized queries (SQL injection prevention) (OWASP A03)',
    'Must validate file uploads (type, size, content) (OWASP A03)',
    'Must implement CSRF tokens for state-changing operations (OWASP A04)',
    'Must implement input length limits (OWASP A04)',
  ],
  api: [
    'Must authenticate all API requests (OWASP A01)',
    'Must authorize requests based on user permissions (OWASP A01)',
    'Must implement rate limiting per user/IP (OWASP A04)',
    'Must validate API keys (OWASP A04)',
    'Must use TLS 1.2+ for all API calls (OWASP A02)',
    'Must log all authentication attempts (OWASP A09)',
    'Must log all API errors (OWASP A09)',
  ],
  payment: [
    'Must encrypt all payment data in transit and at rest (OWASP A02)',
    'Must use tokenization (never store full card numbers) (OWASP A02)',
    'Must use certified payment gateway (Stripe, PayPal) (OWASP A04)',
    'Must validate payment amounts server-side (OWASP A04)',
    'Must log all payment transactions (OWASP A09)',
    'Must implement fraud detection (OWASP A04)',
  ],
  'data-storage': [
    'Must encrypt sensitive data at rest (OWASP A02)',
    'Must implement proper access controls (OWASP A01)',
    'Must validate data before storage (OWASP A03)',
    'Must implement backup and recovery (OWASP A04)',
    'Must log data access and modifications (OWASP A09)',
  ],
};

/**
 * Security Service
 * Generates OWASP Top 10 security requirements
 */
export class SecurityService {
  constructor(private llm: LLMClient) {}

  /**
   * Generate security requirements for a feature
   */
  async generateRequirements(feature: Feature): Promise<EnrichmentSource[]> {
    logger.info({ featureId: feature.id }, 'Generating security requirements');

    const categories = this.detectSecurityCategories(feature);

    if (categories.length === 0) {
      return [
        {
          id: randomUUID(),
          featureId: feature.id,
          sourceType: 'owasp',
          sourceName: 'OWASP Assessment',
          content: 'No specific security requirements - feature does not handle sensitive operations',
          relevanceScore: 1.0,
          mandatory: false,
          fetchedAt: new Date(),
        },
      ];
    }

    // Collect base requirements for detected categories
    const baseRequirements = categories.flatMap(
      (cat) => OWASP_BY_CATEGORY[cat] || []
    );

    // Prioritize and enhance with LLM
    const sources = await this.prioritizeAndEnhance(feature, baseRequirements, categories);

    return sources;
  }

  /**
   * Detect security categories in feature
   */
  private detectSecurityCategories(feature: Feature): SecurityCategory[] {
    const categories = new Set<SecurityCategory>();
    const content = feature.evidence.map((e) => e.content).join(' ').toLowerCase();

    const keywords: Record<SecurityCategory, string[]> = {
      authentication: ['login', 'password', 'auth', 'signin', 'session', 'token', 'jwt'],
      'data-input': ['form', 'input', 'submit', 'upload', 'textarea'],
      api: ['endpoint', 'api', 'request', 'response', 'post', 'get'],
      payment: ['payment', 'credit', 'billing', 'subscription', 'purchase'],
      'data-storage': ['database', 'store', 'save', 'user data', 'profile'],
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some((w) => content.includes(w))) {
        categories.add(category as SecurityCategory);
      }
    }

    return Array.from(categories);
  }

  /**
   * Prioritize and enhance requirements with LLM
   */
  private async prioritizeAndEnhance(
    feature: Feature,
    requirements: string[],
    categories: SecurityCategory[]
  ): Promise<EnrichmentSource[]> {
    const prompt = SecurityPrompts.prioritizeOWASP(feature, requirements, categories);
    const result = await callLLMForJson(
      this.llm,
      prompt,
      SecurityPrioritizationSchema,
      { temperature: 0.1, maxTokens: 2000 }
    );

    if (!result) {
      logger.error('Failed to prioritize security requirements');
      // Return all as medium priority if LLM fails
      return requirements.slice(0, 10).map((content) => ({
        id: randomUUID(),
        featureId: feature.id,
        sourceType: 'owasp' as const,
        sourceName: 'OWASP Top 10',
        sourceUrl: 'https://owasp.org/Top10/',
        content,
        relevanceScore: 0.8,
        mandatory: false,
        fetchedAt: new Date(),
      }));
    }

    const sources: EnrichmentSource[] = [];

    // Critical requirements (mandatory)
    if (result.critical) {
      sources.push(
        ...result.critical
          .filter((i) => i > 0 && i <= requirements.length)
          .map((i) => ({
            id: randomUUID(),
            featureId: feature.id,
            sourceType: 'owasp' as const,
            sourceName: 'OWASP Top 10 - Critical',
            sourceUrl: 'https://owasp.org/Top10/',
            content: requirements[i - 1]!,
            relevanceScore: 1.0,
            mandatory: true,
            fetchedAt: new Date(),
          }))
      );
    }

    // High priority requirements
    if (result.high) {
      sources.push(
        ...result.high
          .filter((i) => i > 0 && i <= requirements.length)
          .map((i) => ({
            id: randomUUID(),
            featureId: feature.id,
            sourceType: 'owasp' as const,
            sourceName: 'OWASP Top 10 - High Priority',
            sourceUrl: 'https://owasp.org/Top10/',
            content: requirements[i - 1]!,
            relevanceScore: 0.9,
            mandatory: false,
            fetchedAt: new Date(),
          }))
      );
    }

    // Additional feature-specific requirements
    if (result.additional) {
      sources.push(
        ...result.additional.map((content) => ({
          id: randomUUID(),
          featureId: feature.id,
          sourceType: 'owasp' as const,
          sourceName: 'OWASP Security Best Practices',
          sourceUrl: 'https://owasp.org/Top10/',
          content,
          relevanceScore: 0.8,
          mandatory: false,
          fetchedAt: new Date(),
        }))
      );
    }

    return sources;
  }
}
