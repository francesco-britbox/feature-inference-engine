/**
 * Platform Guideline Prompts
 * Template prompts for platform guideline generation
 * Follows DRY principle - single source of truth for platform prompts
 */

import type { Feature } from '@/lib/services/enrichment/EnrichmentOrchestrator';

/**
 * Platform Guideline Prompts
 * Contains all prompt templates for platform guidelines
 */
export class PlatformGuidelinePrompts {
  /**
   * iOS Human Interface Guidelines prompt
   */
  static ios(feature: Feature): string {
    return `You are an expert in iOS Human Interface Guidelines (HIG).

Generate iOS-specific platform requirements for: "${feature.name}"

Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map((e) => e.content).join(', ')}

Based on iOS HIG, generate 3-7 specific requirements that apply to this feature.

Focus on:
- UI/UX patterns specific to iOS
- iOS-specific components and behaviors
- Picture-in-Picture, audio interruptions, background modes
- iOS gestures and navigation patterns
- iOS accessibility features

Return JSON:
{
  "requirements": [
    {
      "content": "Must support Picture-in-Picture mode for video playback (iOS HIG)",
      "relevance_score": 0.95,
      "mandatory": true,
      "reasoning": "Core iOS video requirement"
    }
  ]
}

Only include requirements with relevance_score >= 0.6`;
  }

  /**
   * Android Material Design prompt
   */
  static android(feature: Feature): string {
    return `You are an expert in Android Material Design Guidelines.

Generate Android-specific platform requirements for: "${feature.name}"

Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map((e) => e.content).join(', ')}

Based on Material Design 3, generate 3-7 specific requirements that apply to this feature.

Focus on:
- Material Design components and patterns
- Android-specific UI behaviors
- ExoPlayer for media, navigation patterns
- Android gestures and motion
- Android accessibility features

Return JSON:
{
  "requirements": [
    {
      "content": "Must use ExoPlayer for video playback (Material Design)",
      "relevance_score": 0.92,
      "mandatory": true,
      "reasoning": "Standard Android media component"
    }
  ]
}

Only include requirements with relevance_score >= 0.6`;
  }

  /**
   * App Store Review Guidelines prompt
   */
  static appStore(feature: Feature): string {
    return `You are an expert in Apple App Store Review Guidelines.

Generate App Store certification requirements for: "${feature.name}"

Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map((e) => e.content).join(', ')}

Based on App Store Review Guidelines, generate 2-5 specific requirements that could cause app rejection if not followed.

Focus on:
- In-app purchase requirements
- Content restrictions and ratings
- Privacy and data usage
- Permissions and entitlements
- Auto-play policies

Return JSON:
{
  "requirements": [
    {
      "content": "Must not auto-play video with sound without user interaction (Guideline 2.3.8)",
      "relevance_score": 0.9,
      "mandatory": true,
      "rejection_risk": "high"
    }
  ]
}

Only include requirements with relevance_score >= 0.7`;
  }

  /**
   * Google Play Policy prompt
   */
  static googlePlay(feature: Feature): string {
    return `You are an expert in Google Play Store policies.

Generate Google Play policy requirements for: "${feature.name}"

Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map((e) => e.content).join(', ')}

Based on Google Play Developer Program Policies, generate 2-5 specific requirements.

Focus on:
- Content policies
- User data and privacy
- Monetization and ads
- Permissions requirements
- Restricted content

Return JSON:
{
  "requirements": [
    {
      "content": "Must not auto-play video with sound (Content Policies)",
      "relevance_score": 0.85,
      "mandatory": true
    }
  ]
}

Only include requirements with relevance_score >= 0.7`;
  }
}
