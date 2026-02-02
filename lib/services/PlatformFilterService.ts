/**
 * Platform Filter Service
 * Single Responsibility: Determine platform relevance for features
 * Uses keyword-based rules to filter features by target platform
 */

import type { Platform } from '@/lib/types/platform';
import { PLATFORM_KEYWORDS, DEFAULT_PLATFORMS, ALL_PLATFORMS } from '@/lib/constants/platformRules';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ service: 'PlatformFilterService' });

/**
 * Feature with name and optional platforms
 */
interface Feature {
  id: string;
  name: string;
  description?: string | null;
  platforms?: Platform[];
}

/**
 * Platform Filter Service
 * Determines which platforms a feature is relevant for using keyword matching
 */
export class PlatformFilterService {
  /**
   * Determine if a feature is relevant for a specific platform
   * Uses keyword matching against PLATFORM_KEYWORDS rules
   *
   * @param feature - Feature to check
   * @param platform - Target platform
   * @returns True if feature is relevant for the platform
   */
  isFeatureRelevantForPlatform(feature: Feature, platform: Platform): boolean {
    // If feature has explicit platforms defined, use those
    if (feature.platforms && feature.platforms.length > 0) {
      return feature.platforms.includes(platform);
    }

    // Otherwise, use keyword matching
    const relevantPlatforms = this.detectPlatformsFromFeature(feature);

    // If no keywords matched, assume all platforms
    if (relevantPlatforms.length === 0) {
      return true;
    }

    return relevantPlatforms.includes(platform);
  }

  /**
   * Detect relevant platforms from feature name and description
   * Uses keyword matching from PLATFORM_KEYWORDS
   *
   * @param feature - Feature to analyze
   * @returns Array of relevant platforms
   */
  detectPlatformsFromFeature(feature: Feature): Platform[] {
    const text = `${feature.name} ${feature.description || ''}`.toLowerCase();

    const matchedPlatforms = new Set<Platform>();

    // Check each keyword
    for (const [keyword, platforms] of Object.entries(PLATFORM_KEYWORDS)) {
      if (text.includes(keyword.toLowerCase())) {
        // Add all platforms for this keyword
        for (const platform of platforms) {
          matchedPlatforms.add(platform);
        }

        logger.debug(
          { featureId: feature.id, keyword, platforms },
          'Keyword matched'
        );
      }
    }

    // If no keywords matched, return empty (caller decides default behavior)
    return Array.from(matchedPlatforms);
  }

  /**
   * Filter features by platform relevance
   * Returns only features relevant for the specified platform
   *
   * @param features - Array of features to filter
   * @param platform - Target platform
   * @returns Filtered features relevant for platform
   */
  filterFeaturesByPlatform(features: Feature[], platform: Platform): Feature[] {
    return features.filter((feature) =>
      this.isFeatureRelevantForPlatform(feature, platform)
    );
  }

  /**
   * Get platform-specific requirements/notes
   * Returns general guidelines for a platform
   *
   * @param platform - Target platform
   * @returns Array of platform-specific requirement notes
   */
  getPlatformSpecificRequirements(platform: Platform): string[] {
    const requirements: Record<Platform, string[]> = {
      web: [
        'Ensure responsive design for all screen sizes',
        'Test on Chrome, Safari, Firefox, and Edge',
        'Follow WCAG 2.1 AA accessibility guidelines',
        'Optimize for Core Web Vitals (LCP, FID, CLS)',
      ],
      ios: [
        'Follow Apple Human Interface Guidelines',
        'Support iPhone and iPad layouts',
        'Test on iOS 15+ devices',
        'Handle safe area insets',
        'Support Dark Mode',
      ],
      android: [
        'Follow Material Design 3 guidelines',
        'Support Android 8.0+ (API 26+)',
        'Test on various screen sizes and densities',
        'Handle system UI insets',
        'Support Dark Theme',
      ],
      flutter: [
        'Support iOS and Android platforms',
        'Follow Material Design and Cupertino widgets',
        'Test on both platforms',
        'Handle platform-specific navigation',
      ],
      'react-native': [
        'Support iOS and Android platforms',
        'Test on both physical devices and simulators',
        'Handle platform-specific APIs',
        'Optimize bundle size',
      ],
    };

    return requirements[platform] || [];
  }

  /**
   * Get all supported platforms
   *
   * @returns Array of all platform identifiers
   */
  getAllPlatforms(): Platform[] {
    return ALL_PLATFORMS;
  }

  /**
   * Get default platforms (used when no specific platform targeting)
   *
   * @returns Array of default platforms
   */
  getDefaultPlatforms(): Platform[] {
    return DEFAULT_PLATFORMS;
  }
}

/**
 * Singleton instance
 */
export const platformFilterService = new PlatformFilterService();
