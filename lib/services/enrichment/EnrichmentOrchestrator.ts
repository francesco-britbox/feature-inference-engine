/**
 * Enrichment Orchestrator
 * Coordinates all enrichment services (Platform, Legal, Accessibility, Security, Edge Cases)
 * Follows Single Responsibility Principle - orchestration only
 */

import type {
  EnrichmentOptions,
  EnrichmentResult,
  EnrichmentSource,
} from '@/lib/types/enrichment';
import type { PlatformGuidelineService } from './PlatformGuidelineService';
import type { LegalComplianceService } from './LegalComplianceService';
import type { AccessibilityService } from './AccessibilityService';
import type { SecurityService } from './SecurityService';
import type { EdgeCaseService } from './EdgeCaseService';
import { db } from '@/lib/db/client';
import { features, enrichmentSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

/**
 * Feature interface (minimal for enrichment)
 */
export interface Feature {
  id: string;
  name: string;
  description: string;
  evidence: Array<{ type: string; content: string }>;
}

/**
 * Enrichment Orchestrator
 * Coordinates enrichment from multiple sources
 */
export class EnrichmentOrchestrator {
  constructor(
    private platformService: PlatformGuidelineService,
    private legalService: LegalComplianceService,
    private accessibilityService: AccessibilityService,
    private securityService: SecurityService,
    private edgeCaseService: EdgeCaseService
  ) {}

  /**
   * Enrich a feature with external requirements
   * Runs all enrichment sources in parallel for performance
   */
  async enrichFeature(
    featureId: string,
    options: EnrichmentOptions
  ): Promise<EnrichmentResult> {
    logger.info({ featureId, options }, 'Starting feature enrichment');

    // 1. Get feature data
    const feature = await this.getFeature(featureId);

    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // 2. Update status to 'enriching'
    await this.updateFeatureStatus(featureId, 'enriching', null);

    try {
      // 3. Run all enrichments in parallel
      const results = await Promise.allSettled([
        this.enrichPlatform(feature, options),
        this.enrichLegal(feature, options),
        this.enrichAccessibility(feature),
        this.enrichSecurity(feature),
        this.enrichEdgeCases(feature, options),
      ]);

      // 4. Collect successful results
      const sources: EnrichmentSource[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          sources.push(...result.value);
        } else {
          logger.warn({ error: result.reason }, 'Enrichment source failed');
        }
      }

      // 5. Store sources in database
      if (sources.length > 0) {
        await this.storeEnrichmentSources(sources);
      }

      // 6. Update status to 'completed'
      await this.updateFeatureStatus(featureId, 'completed', null);

      logger.info(
        { featureId, sourcesCount: sources.length },
        'Feature enrichment completed'
      );

      return {
        success: true,
        sourcesCount: sources.length,
        sources,
        summary: this.buildSummary(sources),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateFeatureStatus(featureId, 'failed', errorMessage);

      logger.error({ featureId, error: errorMessage }, 'Feature enrichment failed');

      throw error;
    }
  }

  /**
   * Enrich with platform guidelines (iOS, Android, App Store)
   */
  private async enrichPlatform(
    feature: Feature,
    options: EnrichmentOptions
  ): Promise<EnrichmentSource[]> {
    const sources: EnrichmentSource[] = [];

    // iOS guidelines
    if (options.sources.includes('ios_hig')) {
      try {
        const ios = await this.platformService.fetchIOSGuidelines(feature);
        sources.push(...ios);
      } catch (error) {
        logger.warn({ error }, 'iOS guidelines fetch failed');
      }
    }

    // Android guidelines
    if (options.sources.includes('android_material')) {
      try {
        const android = await this.platformService.fetchAndroidGuidelines(feature);
        sources.push(...android);
      } catch (error) {
        logger.warn({ error }, 'Android guidelines fetch failed');
      }
    }

    // App Store certification
    if (options.includeAppStore) {
      try {
        const appStore = await this.platformService.fetchAppStoreRequirements(feature);
        sources.push(...appStore);
      } catch (error) {
        logger.warn({ error }, 'App Store requirements fetch failed');
      }
    }

    return sources;
  }

  /**
   * Enrich with legal compliance (GDPR, CCPA, etc.)
   */
  private async enrichLegal(
    feature: Feature,
    options: EnrichmentOptions
  ): Promise<EnrichmentSource[]> {
    try {
      return await this.legalService.assessCompliance(feature, {
        targetMarkets: options.targetMarkets || ['US', 'EU'],
      });
    } catch (error) {
      logger.warn({ error }, 'Legal compliance assessment failed');
      return [];
    }
  }

  /**
   * Enrich with accessibility requirements (WCAG)
   */
  private async enrichAccessibility(feature: Feature): Promise<EnrichmentSource[]> {
    try {
      return await this.accessibilityService.generateRequirements(feature);
    } catch (error) {
      logger.warn({ error }, 'Accessibility requirements generation failed');
      return [];
    }
  }

  /**
   * Enrich with security requirements (OWASP)
   */
  private async enrichSecurity(feature: Feature): Promise<EnrichmentSource[]> {
    try {
      return await this.securityService.generateRequirements(feature);
    } catch (error) {
      logger.warn({ error }, 'Security requirements generation failed');
      return [];
    }
  }

  /**
   * Enrich with edge cases (GitHub, Stack Overflow, LLM)
   */
  private async enrichEdgeCases(
    feature: Feature,
    options: EnrichmentOptions
  ): Promise<EnrichmentSource[]> {
    try {
      return await this.edgeCaseService.generateEdgeCases(feature, {
        limit: options.edgeCaseLimit || 15,
      });
    } catch (error) {
      logger.warn({ error }, 'Edge case generation failed');
      return [];
    }
  }

  /**
   * Get feature with evidence
   */
  private async getFeature(featureId: string): Promise<Feature | null> {
    // This would need to join with feature_evidence and evidence tables
    // For now, simplified version
    const result = await db.select().from(features).where(eq(features.id, featureId)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const featureRow = result[0];

    if (!featureRow) {
      return null;
    }

    // TODO: Fetch evidence relationships
    // For now, return with empty evidence
    return {
      id: featureRow.id,
      name: featureRow.name,
      description: featureRow.description || '',
      evidence: [],
    };
  }

  /**
   * Update feature enrichment status
   */
  private async updateFeatureStatus(
    featureId: string,
    status: 'enriching' | 'completed' | 'failed',
    error: string | null
  ): Promise<void> {
    await db
      .update(features)
      .set({
        enrichmentStatus: status,
        enrichedAt: status === 'completed' ? new Date() : null,
        enrichmentError: error,
      })
      .where(eq(features.id, featureId));
  }

  /**
   * Store enrichment sources in database
   */
  private async storeEnrichmentSources(sources: EnrichmentSource[]): Promise<void> {
    if (sources.length === 0) {
      return;
    }

    await db.insert(enrichmentSources).values(
      sources.map((source) => ({
        id: source.id,
        featureId: source.featureId,
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl || null,
        content: source.content,
        relevanceScore: source.relevanceScore.toString(),
        mandatory: source.mandatory,
        fetchedAt: source.fetchedAt,
        metadata: source.metadata || null,
      }))
    );
  }

  /**
   * Build enrichment summary
   */
  private buildSummary(
    sources: EnrichmentSource[]
  ): EnrichmentResult['summary'] {
    const byType: Record<string, number> = {};

    for (const source of sources) {
      byType[source.sourceType] = (byType[source.sourceType] || 0) + 1;
    }

    const mandatoryCount = sources.filter((s) => s.mandatory).length;

    return {
      totalSources: sources.length,
      byType: byType as Record<EnrichmentSource['sourceType'], number>,
      mandatoryCount,
    };
  }
}
