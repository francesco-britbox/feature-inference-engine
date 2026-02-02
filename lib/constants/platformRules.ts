/**
 * Platform Rules
 * Keyword-based rules for determining platform relevance
 * Single Responsibility: Platform targeting logic only
 */

import type { Platform } from '@/lib/types/platform';

/**
 * Keywords mapped to supported platforms
 * Features containing these keywords are relevant ONLY for the listed platforms
 */
export const PLATFORM_KEYWORDS: Record<string, Platform[]> = {
  // Mobile-only features
  'in-app purchase': ['ios', 'android', 'flutter', 'react-native'],
  'iap': ['ios', 'android', 'flutter', 'react-native'],
  'storekit': ['ios'],
  'app store': ['ios'],
  'google play': ['android'],
  'play store': ['android'],
  'camera': ['ios', 'android', 'flutter', 'react-native'],
  'photo library': ['ios', 'android', 'flutter', 'react-native'],
  'biometric': ['ios', 'android', 'flutter', 'react-native'],
  'face id': ['ios'],
  'touch id': ['ios'],
  'fingerprint': ['android', 'flutter', 'react-native'],
  'geolocation': ['ios', 'android', 'flutter', 'react-native', 'web'],
  'gps': ['ios', 'android', 'flutter', 'react-native'],
  'accelerometer': ['ios', 'android', 'flutter', 'react-native'],
  'gyroscope': ['ios', 'android', 'flutter', 'react-native'],

  // Web-only features
  'desktop': ['web'],
  'browser': ['web'],
  'service worker': ['web'],
  'pwa': ['web'],
  'progressive web': ['web'],
  'local storage': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'session storage': ['web'],
  'cookies': ['web'],

  // Universal features (available on all platforms)
  'login': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'authentication': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'search': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'notification': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'push': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'video': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'audio': ['web', 'ios', 'android', 'flutter', 'react-native'],
  'playback': ['web', 'ios', 'android', 'flutter', 'react-native'],
};

/**
 * All supported platforms
 */
export const ALL_PLATFORMS: Platform[] = ['web', 'ios', 'android', 'flutter', 'react-native'];

/**
 * Default platforms if no keywords match
 */
export const DEFAULT_PLATFORMS: Platform[] = ['web', 'ios', 'android', 'flutter', 'react-native'];
