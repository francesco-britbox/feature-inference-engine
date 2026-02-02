/**
 * Platform Types
 * Defines supported platforms for feature targeting
 */

/**
 * Supported platforms for feature export
 */
export type Platform = 'web' | 'ios' | 'android' | 'flutter' | 'react-native';

/**
 * Platform display names
 */
export const PLATFORM_NAMES: Record<Platform, string> = {
  web: 'Web',
  ios: 'iOS',
  android: 'Android',
  flutter: 'Flutter',
  'react-native': 'React Native',
};

/**
 * Platform-specific technology stacks
 */
export const PLATFORM_TECH_STACKS: Record<Platform, string[]> = {
  web: ['React', 'HTML5', 'CSS', 'JavaScript', 'TypeScript', 'Next.js', 'Vue'],
  ios: ['Swift', 'UIKit', 'SwiftUI', 'StoreKit', 'AVKit', 'CoreData'],
  android: ['Kotlin', 'Jetpack Compose', 'Android SDK', 'Material Design', 'ExoPlayer'],
  flutter: ['Dart', 'Flutter SDK', 'Material Design', 'Cupertino'],
  'react-native': ['React Native', 'JavaScript', 'TypeScript', 'Expo'],
};
