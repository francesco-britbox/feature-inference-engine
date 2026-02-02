/**
 * Legal Compliance Prompts
 * Template prompts for legal compliance generation
 * Follows DRY principle - single source of truth for legal prompts
 */

import type { Feature } from '@/lib/services/enrichment/EnrichmentOrchestrator';
import type { DataTypes } from '@/lib/types/enrichment';

/**
 * Legal Compliance Prompts
 * Contains all prompt templates for legal compliance
 */
export class LegalCompliancePrompts {
  /**
   * GDPR compliance prompt
   */
  static gdpr(feature: Feature, dataTypes: DataTypes): string {
    return `Generate GDPR compliance requirements for: "${feature.name}"

Feature handles:
- Personal data: ${dataTypes.personal}
- Children data: ${dataTypes.children}
- Health/biometric data: ${dataTypes.health || dataTypes.biometric}

Generate 3-7 specific GDPR requirements (Articles 6, 13, 17, 20, 25, 32, 33).

Return JSON:
{
  "requirements": [
    {
      "content": "Must obtain explicit user consent before collecting personal data (GDPR Art. 6)",
      "article": "6",
      "mandatory": true
    }
  ]
}`;
  }

  /**
   * CCPA compliance prompt
   */
  static ccpa(feature: Feature): string {
    return `Generate CCPA compliance requirements for: "${feature.name}"

Feature description: ${feature.description}

Generate 3-5 specific CCPA requirements (California privacy law).

Focus on:
- Right to know what data is collected
- Right to delete personal data
- Right to opt-out of data sale
- Non-discrimination for exercising rights

Return JSON:
{
  "requirements": [
    {
      "content": "Must provide 'Do Not Sell My Personal Information' link (CCPA)",
      "mandatory": true
    }
  ]
}`;
  }

  /**
   * COPPA compliance prompt
   */
  static coppa(feature: Feature): string {
    return `Generate COPPA compliance requirements for: "${feature.name}"

This feature involves children under 13 years old.

Generate 2-4 specific COPPA requirements.

Focus on:
- Verifiable parental consent
- Limited data collection from children
- Parental access to child's data
- Data security for children

Return JSON:
{
  "requirements": [
    {
      "content": "Must obtain verifiable parental consent before collecting data from users under 13 (COPPA)",
      "mandatory": true
    }
  ]
}`;
  }

  /**
   * Copyright compliance prompt
   */
  static copyright(feature: Feature): string {
    return `Generate copyright compliance requirements for: "${feature.name}"

This feature involves video/audio content delivery.

Generate 3-5 specific copyright requirements.

Focus on:
- Content licensing verification
- DRM for protected content
- Geo-blocking for regional rights
- DMCA compliance
- Attribution requirements

Return JSON:
{
  "requirements": [
    {
      "content": "Must verify content licensing rights before playback",
      "mandatory": true
    }
  ]
}`;
  }

  /**
   * Age restriction prompt
   */
  static ageRestrictions(feature: Feature): string {
    return `Generate age restriction and content rating requirements for: "${feature.name}"

This feature involves content delivery or social features.

Generate 2-4 specific requirements.

Focus on:
- Content rating system (MPAA/PEGI)
- Age verification
- Parental controls
- Regional content restrictions

Return JSON:
{
  "requirements": [
    {
      "content": "Must implement content rating system (MPAA/PEGI)",
      "mandatory": false
    }
  ]
}`;
  }
}
