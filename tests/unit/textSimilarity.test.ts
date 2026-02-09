/**
 * Tests for text similarity utilities
 * Verifies word-overlap matching correctly handles:
 * - Stopword filtering
 * - Minimum meaningful word threshold (2-word minimum prevents single-word false positives)
 * - Jaccard similarity calculation
 */

import { describe, it, expect } from 'vitest';
import {
  extractMeaningfulWords,
  calculateWordOverlap,
  areNamesSimilar,
  findBestMatch,
} from '@/lib/utils/textSimilarity';

describe('extractMeaningfulWords', () => {
  it('should lowercase and split on whitespace', () => {
    const words = extractMeaningfulWords('User Login');
    expect(words).toContain('user');
    expect(words).toContain('login');
  });

  it('should split on hyphens and underscores', () => {
    const words = extractMeaningfulWords('user-login_flow');
    expect(words).toContain('user');
    expect(words).toContain('login');
    expect(words).toContain('flow');
  });

  it('should filter stopwords', () => {
    const words = extractMeaningfulWords('The User and Login');
    expect(words).not.toContain('the');
    expect(words).not.toContain('and');
    expect(words).toContain('user');
    expect(words).toContain('login');
  });

  it('should keep domain-relevant words like management and system', () => {
    const words = extractMeaningfulWords('User Management System');
    expect(words).toContain('management');
    expect(words).toContain('system');
    expect(words).toContain('user');
  });

  it('should filter single-character words', () => {
    const words = extractMeaningfulWords('A B Login');
    expect(words).not.toContain('a');
    expect(words).not.toContain('b');
    expect(words).toContain('login');
  });
});

describe('calculateWordOverlap', () => {
  it('should return 0 when no meaningful words in common', () => {
    expect(calculateWordOverlap('User Login', 'Video Playback')).toBe(0);
  });

  it('should return 0 when only 1 common word but both have 2+', () => {
    // "User" is the only common meaningful word, but both have 2 words
    // -> requires min 2 common, so returns 0
    expect(calculateWordOverlap('User Authentication', 'User Profile')).toBe(0);
  });

  it('should NOT match "User Management" and "Content Management"', () => {
    // Only 1 common word ("management") but both have 2+ words,
    // so the min-2-common-words threshold prevents a match
    expect(calculateWordOverlap('User Management', 'Content Management')).toBe(0);
  });

  it('should match identical feature names', () => {
    expect(calculateWordOverlap('User Login', 'User Login')).toBe(1);
  });

  it('should match with high overlap', () => {
    const overlap = calculateWordOverlap('User Login Authentication', 'User Authentication Login');
    expect(overlap).toBeGreaterThan(0.5);
  });

  it('should match single-word features if they are the same', () => {
    // Both have 1 meaningful word each, threshold drops to 1
    expect(calculateWordOverlap('Login', 'Login')).toBe(1);
  });

  it('should return 0 for different single-word features', () => {
    expect(calculateWordOverlap('Login', 'Playback')).toBe(0);
  });

  it('should return 0 for empty strings', () => {
    expect(calculateWordOverlap('', 'Login')).toBe(0);
    expect(calculateWordOverlap('Login', '')).toBe(0);
    expect(calculateWordOverlap('', '')).toBe(0);
  });
});

describe('areNamesSimilar', () => {
  it('should match exact names (case insensitive)', () => {
    expect(areNamesSimilar('User Login', 'user login')).toBe(true);
  });

  it('should match when one is substring of the other', () => {
    expect(areNamesSimilar('Login', 'User Login')).toBe(true);
    expect(areNamesSimilar('User Login', 'Login')).toBe(true);
  });

  it('should NOT match unrelated features', () => {
    expect(areNamesSimilar('User Login', 'Video Playback')).toBe(false);
  });

  it('should NOT match features that only share one word', () => {
    // "management" is the only common word, below the 2-word minimum
    expect(areNamesSimilar('User Management', 'Content Management')).toBe(false);
  });

  it('should NOT match features sharing only "User"', () => {
    expect(areNamesSimilar('User Authentication', 'User Profile')).toBe(false);
  });

  it('should match features with high meaningful overlap', () => {
    expect(areNamesSimilar('Email Login Authentication', 'Authentication Email Login')).toBe(true);
  });
});

describe('findBestMatch', () => {
  it('should find exact match', () => {
    const map = new Map([
      ['User Login', 'id1'],
      ['Video Playback', 'id2'],
    ]);
    expect(findBestMatch('User Login', map)).toBe('id1');
  });

  it('should find case-insensitive match', () => {
    const map = new Map([
      ['User Login', 'id1'],
    ]);
    expect(findBestMatch('user login', map)).toBe('id1');
  });

  it('should return null when no match', () => {
    const map = new Map([
      ['Video Playback', 'id2'],
    ]);
    expect(findBestMatch('User Login', map)).toBeNull();
  });

  it('should return the best match among multiple candidates', () => {
    const map = new Map([
      ['Authentication Login', 'id1'],
      ['Video Playback Controls', 'id2'],
    ]);
    // "User Login Authentication" shares "authentication" and "login" with id1
    expect(findBestMatch('User Login Authentication', map)).toBe('id1');
  });
});
