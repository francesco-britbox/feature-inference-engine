/**
 * Feature Hierarchy Service
 * Single Responsibility: Detect and assign parent-child relationships between features
 * Follows DIP: Depends on LLMClient abstraction
 */

import type { LLMClient } from '@/lib/types/llm';
import type { FeatureType } from '@/lib/types/feature';
import { db } from '@/lib/db/client';
import { features } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/utils/logger';
import { findBestMatch } from '@/lib/utils/textSimilarity';
import { chatRateLimiter } from '@/lib/ai/openai';
import { openaiClient } from '@/lib/ai/OpenAIClient';
import { InvalidDataError } from '@/lib/utils/errors';

const logger = createLogger({ service: 'FeatureHierarchyService' });

/**
 * Hierarchy analysis result from LLM
 */
interface HierarchyAnalysis {
  is_child_of: boolean;
  confidence: number; // 0-1
  reasoning: string;
  recommended_type: FeatureType;
}

/**
 * Feature classification result
 */
interface ClassificationResult {
  featureId: string;
  featureName: string;
  featureType: FeatureType;
  reasoning: string;
  indicators: string[];
}

export class FeatureHierarchyService {
  private readonly MODEL = 'gpt-4o';
  private readonly TEMPERATURE = 0.2; // Low for consistent classification
  private readonly HIERARCHY_CONFIDENCE_THRESHOLD = 0.7; // Min confidence for parent-child link

  constructor(private llmClient: LLMClient) {}

  /**
   * Main entry point: Build hierarchy for all features
   *
   * Algorithm:
   * 1. Classify each feature (epic, story, task)
   * 2. Detect parent-child relationships
   * 3. Update database with hierarchy
   * 4. Validate no circular references
   *
   * @returns Count of relationships created
   */
  async buildHierarchyForAllFeatures(): Promise<{
    classified: number;
    relationships: number;
    epics: number;
    stories: number;
    tasks: number;
    synthesizedEpics: number;
  }> {
    logger.info('Starting hierarchy detection for all features');

    try {
      // Step 1: Get all features without hierarchy (parent_id = NULL)
      const unclassifiedFeatures = await db
        .select({
          id: features.id,
          name: features.name,
          description: features.description,
          confidenceScore: features.confidenceScore,
        })
        .from(features)
        .where(eq(features.featureType, 'epic')); // Only process epics (default)

      if (unclassifiedFeatures.length === 0) {
        logger.info('No unclassified features found');
        return { classified: 0, relationships: 0, epics: 0, stories: 0, tasks: 0, synthesizedEpics: 0 };
      }

      logger.info({ count: unclassifiedFeatures.length }, 'Processing features');

      // Step 2: Classify each feature (epic vs story vs task)
      const classifications = await this.classifyAllFeatures(unclassifiedFeatures);

      // Step 2.5: Synthesize missing epics and assign stories to parents
      const synthesisResult = await this.synthesizeMissingEpics(classifications);

      // Step 3: Update database
      await this.applyHierarchy(synthesisResult.enrichedClassifications, synthesisResult.relationships);

      // Step 4: Validate no circular references
      await this.validateNoCircularReferences();

      // Count by type
      const counts = {
        classified: synthesisResult.enrichedClassifications.length,
        relationships: synthesisResult.relationships.length,
        epics: synthesisResult.enrichedClassifications.filter((c) => c.featureType === 'epic').length,
        stories: synthesisResult.enrichedClassifications.filter((c) => c.featureType === 'story').length,
        tasks: synthesisResult.enrichedClassifications.filter((c) => c.featureType === 'task').length,
        synthesizedEpics: synthesisResult.synthesizedEpics,
      };

      logger.info(counts, 'Hierarchy detection completed successfully');

      return counts;
    } catch (error) {
      logger.error({ error }, 'Hierarchy detection failed');
      throw error;
    }
  }

  /**
   * Step 2: Classify all features as epic, story, or task
   */
  private async classifyAllFeatures(
    featuresData: Array<{
      id: string;
      name: string;
      description: string | null;
      confidenceScore: string | null;
    }>
  ): Promise<ClassificationResult[]> {
    logger.info({ count: featuresData.length }, 'Classifying features');

    const results: ClassificationResult[] = [];

    for (const feature of featuresData) {
      const classification = await this.classifyFeature(feature);
      results.push(classification);

      logger.debug(
        {
          featureName: feature.name,
          classification: classification.featureType,
          indicators: classification.indicators,
        },
        'Feature classified'
      );
    }

    return results;
  }

  /**
   * Classify a single feature using LLM + rules
   */
  private async classifyFeature(feature: {
    id: string;
    name: string;
    description: string | null;
    confidenceScore: string | null;
  }): Promise<ClassificationResult> {
    // Build classification prompt
    const prompt = this.buildClassificationPrompt(feature.name, feature.description || '');

    try {
      // Call LLM
      const response = await chatRateLimiter.schedule(() =>
        this.llmClient.chat({
          model: this.MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.TEMPERATURE,
          responseFormat: { type: 'json_object' },
        })
      );

      if (!response.content) {
        // Fallback: Use heuristics
        return this.classifyWithHeuristics(feature);
      }

      // Parse LLM response
      const parsed = JSON.parse(response.content) as {
        feature_type: string;
        reasoning: string;
        indicators: string[];
      };

      // Validate
      if (!['epic', 'story', 'task'].includes(parsed.feature_type)) {
        logger.warn(
          { featureName: feature.name, type: parsed.feature_type },
          'Invalid feature type from LLM, using heuristics'
        );
        return this.classifyWithHeuristics(feature);
      }

      return {
        featureId: feature.id,
        featureName: feature.name,
        featureType: parsed.feature_type as FeatureType,
        reasoning: parsed.reasoning,
        indicators: parsed.indicators,
      };
    } catch (error) {
      logger.warn({ error, featureName: feature.name }, 'LLM classification failed, using heuristics');
      return this.classifyWithHeuristics(feature);
    }
  }

  /**
   * Build LLM prompt for feature classification
   */
  private buildClassificationPrompt(name: string, description: string): string {
    return `
Classify this OTT platform feature as either an "epic", "story", or "task".

DEFINITIONS:
- **Epic**: Broad functionality domain with multiple related features
  - Examples: "User Authentication", "Content Management", "Payment Processing"
  - Indicators: Multiple verbs, domain nouns, system-wide scope
  - Jira: Top-level container for related stories

- **Story**: Specific user-facing functionality or action
  - Examples: "User Login", "Video Playback", "Add to Watchlist"
  - Indicators: Single action verb, specific functionality, user-facing
  - Jira: Deliverable unit of work under an epic

- **Task**: Implementation detail or technical subtask
  - Examples: "Create login form", "Add validation", "Write unit tests"
  - Indicators: Very specific, technical focus, implementation-level
  - Jira: Subtask under a story

FEATURE TO CLASSIFY:
Name: "${name}"
Description: "${description}"

INSTRUCTIONS:
1. Analyze the scope (broad domain vs specific action vs implementation detail)
2. Count implicit features (if name suggests multiple features, it's an epic)
3. Check action verbs (multiple verbs = epic, single verb = story)
4. Consider user perspective (epic = "I need auth system", story = "I can log in")

OUTPUT (JSON):
{
  "feature_type": "epic|story|task",
  "reasoning": "Why this classification is correct",
  "indicators": ["indicator 1", "indicator 2", "indicator 3"]
}

EXAMPLES:
- "User Authentication" → epic (broad domain: login + logout + register + reset)
- "User Login" → story (specific action within auth domain)
- "Create login form component" → task (implementation detail)
- "Content Discovery" → epic (broad: search + browse + filter + recommend)
- "Search Content" → story (specific action within discovery)
`.trim();
  }

  /**
   * Fallback heuristic-based classification (if LLM fails)
   */
  private classifyWithHeuristics(feature: {
    id: string;
    name: string;
    description: string | null;
    confidenceScore: string | null;
  }): ClassificationResult {
    const name = feature.name.toLowerCase();
    const indicators: string[] = [];

    // Heuristic 1: Word count (more words = broader scope)
    const wordCount = name.split(/\s+/).length;

    // Heuristic 2: Contains multiple action verbs
    const actionVerbs = ['manage', 'create', 'update', 'delete', 'view', 'search', 'filter'];
    const verbCount = actionVerbs.filter((verb) => name.includes(verb)).length;

    // Heuristic 3: Domain keywords
    const domainKeywords = ['management', 'system', 'service', 'platform', 'authentication'];
    const hasDomainKeyword = domainKeywords.some((keyword) => name.includes(keyword));

    // Heuristic 4: High confidence suggests well-supported (epic-level)
    const confidence = parseFloat(feature.confidenceScore || '0');
    const highConfidence = confidence >= 0.85;

    // Decision logic
    let featureType: FeatureType = 'story'; // Default

    if (hasDomainKeyword || verbCount >= 2) {
      featureType = 'epic';
      indicators.push('Domain keyword present');
      indicators.push(`${verbCount} action verbs`);
    } else if (
      wordCount <= 3 &&
      (name.includes('button') || name.includes('click') || name.includes('form'))
    ) {
      featureType = 'task';
      indicators.push('Very specific UI element');
    } else if (highConfidence && wordCount >= 3) {
      featureType = 'epic';
      indicators.push('High confidence + broad scope');
    }

    return {
      featureId: feature.id,
      featureName: feature.name,
      featureType,
      reasoning: `Heuristic classification based on: ${indicators.join(', ')}`,
      indicators,
    };
  }

  /**
   * Pending epic to be inserted inside the applyHierarchy transaction
   */
  private pendingEpicInserts: Array<{
    name: string;
    description: string;
    tempKey: string; // LLM-proposed name used as lookup key
  }> = [];

  /**
   * Synthesize missing epics for orphan stories.
   * Uses a single LLM call to assign stories to existing epics and propose new ones.
   * Falls back to detectParentChildRelationships if synthesis fails.
   *
   * IMPORTANT: Does NOT insert synthetic epics into DB directly.
   * Instead, stores them in pendingEpicInserts for the transaction in applyHierarchy.
   */
  private async synthesizeMissingEpics(
    classifications: ClassificationResult[]
  ): Promise<{
    enrichedClassifications: ClassificationResult[];
    relationships: Array<{ childId: string; parentId: string; confidence: number }>;
    synthesizedEpics: number;
    pendingEpics: Array<{ name: string; description: string; tempKey: string }>;
  }> {
    this.pendingEpicInserts = [];

    const epics = classifications.filter((c) => c.featureType === 'epic');
    const stories = classifications.filter((c) => c.featureType === 'story');

    if (stories.length === 0) {
      logger.info('No stories found, skipping epic synthesis');
      return { enrichedClassifications: classifications, relationships: [], synthesizedEpics: 0, pendingEpics: [] };
    }

    logger.info(
      { epics: epics.length, stories: stories.length },
      'Starting epic synthesis for orphan stories'
    );

    try {
      const prompt = this.buildEpicSynthesisPrompt(epics, stories);

      const response = await chatRateLimiter.schedule(() =>
        this.llmClient.chat({
          model: this.MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.TEMPERATURE,
          responseFormat: { type: 'json_object' },
        })
      );

      if (!response.content) {
        logger.warn('LLM returned empty response for epic synthesis, falling back');
        const fallbackRels = await this.detectParentChildRelationships(classifications);
        return { enrichedClassifications: classifications, relationships: fallbackRels, synthesizedEpics: 0, pendingEpics: [] };
      }

      const parsed = JSON.parse(response.content) as {
        assignments: Array<{ story: string; parent_epic: string }>;
        new_epics: Array<{ name: string; description: string }>;
      };

      // Build name→id maps for existing features
      const epicNameToId = new Map<string, string>();
      for (const epic of epics) {
        epicNameToId.set(epic.featureName, epic.featureId);
      }
      const storyNameToId = new Map<string, string>();
      for (const story of stories) {
        storyNameToId.set(story.featureName, story.featureId);
      }

      // Track enriched classifications (start with all existing)
      const enrichedClassifications = [...classifications];
      let synthesizedCount = 0;

      // Collect new epics proposed by LLM — DO NOT insert yet, defer to transaction
      // Use a temporary placeholder key (the proposed name) for relationship resolution
      const proposedEpicNames = new Set<string>();
      const pendingEpics: Array<{ name: string; description: string; tempKey: string }> = [];

      for (const proposedEpic of parsed.new_epics ?? []) {
        const existingId = this.findSimilarEpic(proposedEpic.name, epicNameToId);

        if (existingId) {
          logger.info(
            { proposed: proposedEpic.name, existingId },
            'Proposed epic matches existing epic, reusing'
          );
          // Already exists, no insert needed. Map the proposed name to existing ID.
          epicNameToId.set(proposedEpic.name, existingId);
        } else {
          pendingEpics.push({
            name: proposedEpic.name,
            description: proposedEpic.description,
            tempKey: proposedEpic.name,
          });
          proposedEpicNames.add(proposedEpic.name);
          synthesizedCount++;

          logger.info(
            { epicName: proposedEpic.name },
            'Queued synthetic epic for transactional insert'
          );
        }
      }

      // Build relationships from assignments.
      // For proposed epics that don't have IDs yet, use a placeholder marker
      // (the proposed name prefixed with __PENDING__) that applyHierarchy will resolve.
      const relationships: Array<{ childId: string; parentId: string; confidence: number }> = [];
      for (const assignment of parsed.assignments ?? []) {
        const childId = this.resolveFeatureId(assignment.story, storyNameToId);

        let parentId: string | null = null;
        // Try to resolve to existing epic first
        parentId = this.resolveFeatureId(assignment.parent_epic, epicNameToId);
        // If not found and it's a proposed epic, use temp key
        if (!parentId && proposedEpicNames.has(assignment.parent_epic)) {
          parentId = `__PENDING__${assignment.parent_epic}`;
        }

        if (childId && parentId) {
          relationships.push({ childId, parentId, confidence: 0.8 });
        } else {
          logger.warn(
            { story: assignment.story, epic: assignment.parent_epic },
            'Could not resolve assignment IDs'
          );
        }
      }

      this.pendingEpicInserts = pendingEpics;

      logger.info(
        { synthesizedEpics: synthesizedCount, assignedRelationships: relationships.length },
        'Epic synthesis completed (inserts deferred to transaction)'
      );

      return { enrichedClassifications, relationships, synthesizedEpics: synthesizedCount, pendingEpics };
    } catch (error) {
      logger.error({ error }, 'Epic synthesis failed, falling back to pairwise detection');
      const fallbackRels = await this.detectParentChildRelationships(classifications);
      return { enrichedClassifications: classifications, relationships: fallbackRels, synthesizedEpics: 0, pendingEpics: [] };
    }
  }

  /**
   * Build LLM prompt for epic synthesis: assign stories to epics and propose new ones.
   */
  private buildEpicSynthesisPrompt(
    epics: ClassificationResult[],
    stories: ClassificationResult[]
  ): string {
    const epicList =
      epics.length > 0
        ? epics.map((e) => `- "${e.featureName}"`).join('\n')
        : '(none)';

    const storyList = stories.map((s) => `- "${s.featureName}"`).join('\n');

    return `
You are organizing OTT platform features into a hierarchy. Every story MUST have a parent epic.

EXISTING EPICS:
${epicList}

STORIES TO ASSIGN:
${storyList}

INSTRUCTIONS:
1. Assign each story to the most appropriate existing epic.
2. If a story does NOT fit any existing epic, propose a NEW broad epic for it.
3. New epics should be broad functional domains (e.g., "User Authentication", "Content Discovery", "Navigation & Layout").
4. Group multiple related orphan stories under the same new epic when possible.
5. Every story MUST appear in exactly one assignment.

OUTPUT (JSON):
{
  "assignments": [
    { "story": "exact story name", "parent_epic": "exact epic name (existing or new)" }
  ],
  "new_epics": [
    { "name": "New Epic Name", "description": "Brief description of this functional domain" }
  ]
}

RULES:
- "story" must exactly match one of the story names listed above
- "parent_epic" must exactly match an existing epic name OR a name from "new_epics"
- Every story in the list above MUST appear in "assignments"
- Only propose new epics when no existing epic is a reasonable fit
- Prefer fewer, broader new epics over many narrow ones
`.trim();
  }

  /**
   * Check if a proposed epic name is similar to an existing epic.
   * Uses meaningful word overlap (stopword-filtered, Jaccard similarity).
   * Returns the existing epic's ID if similar, or null.
   */
  private findSimilarEpic(
    proposedName: string,
    epicNameToId: Map<string, string>
  ): string | null {
    return findBestMatch(proposedName, epicNameToId, 0.5);
  }

  /**
   * Resolve a feature name to its ID, using fuzzy matching as fallback.
   */
  private resolveFeatureId(
    name: string,
    nameToId: Map<string, string>
  ): string | null {
    // Exact match
    const exact = nameToId.get(name);
    if (exact) return exact;

    // Case-insensitive match
    const lower = name.toLowerCase().trim();
    for (const [key, id] of nameToId) {
      if (key.toLowerCase().trim() === lower) {
        return id;
      }
    }

    return null;
  }

  /**
   * Step 3 (fallback): Detect parent-child relationships between features
   */
  private async detectParentChildRelationships(
    classifications: ClassificationResult[]
  ): Promise<Array<{ childId: string; parentId: string; confidence: number }>> {
    logger.info('Detecting parent-child relationships');

    const relationships: Array<{ childId: string; parentId: string; confidence: number }> = [];

    // Get potential parents (epics only)
    const potentialParents = classifications.filter((c) => c.featureType === 'epic');

    // Get candidates (stories only - stories can have epic parents)
    const candidates = classifications.filter((c) => c.featureType === 'story');

    if (potentialParents.length === 0 || candidates.length === 0) {
      logger.info('No epic-story pairs to analyze');
      return relationships;
    }

    logger.info(
      { epics: potentialParents.length, stories: candidates.length },
      'Analyzing relationships'
    );

    // Compare each story with each epic
    for (const candidate of candidates) {
      let bestParent: { id: string; confidence: number } | null = null;

      for (const potentialParent of potentialParents) {
        // Don't compare feature with itself
        if (candidate.featureId === potentialParent.featureId) {
          continue;
        }

        // Analyze relationship
        const analysis = await this.analyzeHierarchyRelationship(
          candidate.featureName,
          potentialParent.featureName
        );

        // If this is a parent-child relationship and confidence > threshold
        if (analysis.is_child_of && analysis.confidence >= this.HIERARCHY_CONFIDENCE_THRESHOLD) {
          // Keep track of best parent (highest confidence)
          if (!bestParent || analysis.confidence > bestParent.confidence) {
            bestParent = {
              id: potentialParent.featureId,
              confidence: analysis.confidence,
            };
          }
        }
      }

      // Assign best parent if found
      if (bestParent) {
        relationships.push({
          childId: candidate.featureId,
          parentId: bestParent.id,
          confidence: bestParent.confidence,
        });

        logger.info(
          {
            child: candidate.featureName,
            parent: potentialParents.find((p) => p.featureId === bestParent!.id)?.featureName,
            confidence: bestParent.confidence,
          },
          'Parent-child relationship detected'
        );
      }
    }

    return relationships;
  }

  /**
   * Analyze if candidateFeature is a child of potentialParent
   */
  private async analyzeHierarchyRelationship(
    candidateName: string,
    potentialParentName: string
  ): Promise<HierarchyAnalysis> {
    const prompt = this.buildHierarchyPrompt(candidateName, potentialParentName);

    try {
      const response = await chatRateLimiter.schedule(() =>
        this.llmClient.chat({
          model: this.MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.TEMPERATURE,
          responseFormat: { type: 'json_object' },
        })
      );

      if (!response.content) {
        // Fallback: Use heuristics
        return {
          is_child_of: false,
          confidence: 0,
          reasoning: 'LLM returned empty response',
          recommended_type: 'story',
        };
      }

      const parsed = JSON.parse(response.content) as {
        is_child_of: boolean;
        confidence: number;
        reasoning: string;
        recommended_type: string;
      };

      // Validate
      if (parsed.confidence < 0 || parsed.confidence > 1) {
        logger.warn({ parsed }, 'Invalid confidence from LLM, defaulting to 0');
        parsed.confidence = 0;
      }

      return {
        is_child_of: parsed.is_child_of,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        recommended_type: parsed.recommended_type as FeatureType,
      };
    } catch (error) {
      logger.warn({ error, candidateName, potentialParentName }, 'LLM hierarchy analysis failed');
      return {
        is_child_of: false,
        confidence: 0,
        reasoning: 'LLM analysis failed',
        recommended_type: 'story',
      };
    }
  }

  /**
   * Build LLM prompt for hierarchy detection
   */
  private buildHierarchyPrompt(candidateName: string, potentialParentName: string): string {
    return `
Analyze if Feature A is a CHILD (subset/component) of Feature B in an OTT platform.

DEFINITIONS:
- **Child relationship (is_child_of = true)**:
  - Feature A is a SPECIFIC ACTION within Feature B's domain
  - Feature A is a COMPONENT of Feature B
  - Feature A CANNOT exist independently of Feature B's context
  - Examples:
    * "User Login" is child of "User Authentication" ✅
    * "Video Playback Controls" is child of "Video Playback" ✅
    * "Search Results Sorting" is child of "Search" ✅

- **Not a child (is_child_of = false)**:
  - Feature A is UNRELATED to Feature B
  - Feature A is a SIBLING (same level, different domain)
  - Feature A is actually the PARENT of Feature B
  - Examples:
    * "User Login" is NOT child of "Content Discovery" ❌
    * "Payment Processing" is NOT child of "User Authentication" ❌
    * "Video Playback" is NOT child of "Video Player Controls" ❌ (reversed)

FEATURES:
Feature A (candidate): "${candidateName}"
Feature B (potential parent): "${potentialParentName}"

ANALYSIS GUIDELINES:
1. Check if Feature A's domain is CONTAINED WITHIN Feature B's domain
2. Check if Feature A is MORE SPECIFIC than Feature B
3. Check if Feature A uses similar keywords but narrower scope
4. Check if Feature A would be listed "under" Feature B in documentation

CONFIDENCE LEVELS:
- 0.9-1.0: Obvious parent-child (Login ⊂ Authentication)
- 0.7-0.89: Strong relationship (Playback Controls ⊂ Video Playback)
- 0.5-0.69: Weak relationship (possibly sibling, not parent-child)
- 0-0.49: Unrelated or reversed

OUTPUT (JSON):
{
  "is_child_of": true|false,
  "confidence": 0.0-1.0,
  "reasoning": "Why Feature A is/isn't a child of Feature B",
  "recommended_type": "story|task"
}

IMPORTANT:
- If Feature A is BROADER than Feature B, return is_child_of=false (it's the parent!)
- If features are SIBLINGS (same level), return is_child_of=false
- Only return true if A is genuinely a SUBSET of B
`.trim();
  }

  /**
   * Step 4: Apply hierarchy to database (transaction)
   * Inserts synthetic epics AND updates all features atomically.
   */
  private async applyHierarchy(
    classifications: ClassificationResult[],
    relationships: Array<{ childId: string; parentId: string; confidence: number }>
  ): Promise<void> {
    logger.info('Applying hierarchy to database');

    await db.transaction(async (tx) => {
      // Insert pending synthetic epics inside the transaction
      const pendingKeyToId = new Map<string, string>();
      for (const pending of this.pendingEpicInserts) {
        const insertResult = await tx
          .insert(features)
          .values({
            name: pending.name,
            description: pending.description,
            featureType: 'epic',
            hierarchyLevel: 0,
            status: 'candidate',
            metadata: { synthetic: true, synthesized_at: new Date().toISOString() },
          })
          .returning({ id: features.id });

        const inserted = insertResult[0];
        if (inserted) {
          pendingKeyToId.set(`__PENDING__${pending.tempKey}`, inserted.id);
          logger.info(
            { epicName: pending.name, epicId: inserted.id },
            'Synthetic epic inserted in transaction'
          );
        }
      }
      // Clear pending list after insert
      this.pendingEpicInserts = [];

      // Build a map of childId -> parentId for quick lookup,
      // resolving __PENDING__ markers to actual IDs
      const childToParentMap = new Map<string, { parentId: string; confidence: number }>();
      for (const relationship of relationships) {
        let parentId = relationship.parentId;
        // Resolve pending epic markers
        if (parentId.startsWith('__PENDING__')) {
          const resolvedId = pendingKeyToId.get(parentId);
          if (resolvedId) {
            parentId = resolvedId;
          } else {
            logger.warn(
              { marker: parentId },
              'Could not resolve pending epic marker, skipping relationship'
            );
            continue;
          }
        }
        childToParentMap.set(relationship.childId, {
          parentId,
          confidence: relationship.confidence,
        });
      }

      // Update features: if they have a parent relationship, update type + parent together
      // Otherwise adjust type to epic if orphan story
      for (const classification of classifications) {
        // CRITICAL FIX: If classified as story/task but NO parent found, promote to epic
        // This handles "orphan stories" that violate the check_epic_no_parent constraint
        let effectiveType = classification.featureType;
        const parentInfo = childToParentMap.get(classification.featureId);

        if ((effectiveType === 'story' || effectiveType === 'task') && !parentInfo) {
          // Orphan story/task: promote to epic to satisfy constraint
          effectiveType = 'epic';
          logger.info(
            { featureId: classification.featureId, originalType: classification.featureType },
            'Promoted orphan story to epic (no parent found)'
          );
        }
        const hierarchyLevel =
          effectiveType === 'epic' ? 0 : effectiveType === 'story' ? 1 : 2;

        if (parentInfo) {
          // Has parent: update type, level, AND parent_id together (avoids constraint violation)
          const timestamp = new Date().toISOString();
          await tx
            .update(features)
            .set({
              featureType: effectiveType,
              hierarchyLevel,
              parentId: parentInfo.parentId,
              metadata: sql`
                COALESCE(${features.metadata}, '{}'::jsonb) ||
                jsonb_build_object(
                  'parent_detected_confidence', ${sql.raw(String(parentInfo.confidence))},
                  'parent_detected_at', ${sql.raw(`'${timestamp}'`)}
                )
              `,
            })
            .where(eq(features.id, classification.featureId));

          logger.debug(
            {
              featureId: classification.featureId,
              type: effectiveType,
              parentId: parentInfo.parentId,
            },
            'Feature type and parent updated'
          );
        } else {
          // No parent: update type (already promoted to epic if needed) and level
          await tx
            .update(features)
            .set({
              featureType: effectiveType,
              hierarchyLevel,
            })
            .where(eq(features.id, classification.featureId));

          logger.debug(
            { featureId: classification.featureId, type: effectiveType },
            'Feature type updated'
          );
        }
      }
    });

    logger.info('Hierarchy applied successfully');
  }

  /**
   * Step 5: Validate no circular references exist
   */
  private async validateNoCircularReferences(): Promise<void> {
    logger.info('Validating no circular references');

    // Query to detect circular references using recursive CTE
    const result = await db.execute(sql`
      WITH RECURSIVE hierarchy_check AS (
        -- Start with all features
        SELECT id, parent_id, ARRAY[id] as path, 0 as depth
        FROM features
        WHERE parent_id IS NOT NULL

        UNION ALL

        -- Recursively follow parent chain
        SELECT f.id, f.parent_id, h.path || f.parent_id, h.depth + 1
        FROM features f
        INNER JOIN hierarchy_check h ON f.parent_id = h.id
        WHERE f.parent_id = ANY(h.path) -- Circular reference detected
        AND h.depth < 10 -- Prevent infinite loop
      )
      SELECT id, parent_id, path
      FROM hierarchy_check
      WHERE parent_id = ANY(path); -- These are circular
    `);

    if (result.rows.length > 0) {
      logger.error({ circularReferences: result.rows }, 'Circular references detected');
      throw new InvalidDataError(
        `Circular references found: ${result.rows.length} features affected`,
        'parentId'
      );
    }

    logger.info('No circular references found');
  }

  /**
   * Get children of a feature
   */
  async getChildren(featureId: string): Promise<
    Array<{
      id: string;
      name: string;
      featureType: FeatureType;
      confidenceScore: string | null;
    }>
  > {
    const children = await db
      .select({
        id: features.id,
        name: features.name,
        featureType: features.featureType,
        confidenceScore: features.confidenceScore,
      })
      .from(features)
      .where(eq(features.parentId, featureId));

    return children as Array<{
      id: string;
      name: string;
      featureType: FeatureType;
      confidenceScore: string | null;
    }>;
  }

  /**
   * Get full hierarchy tree for a feature (ancestors + descendants)
   */
  async getHierarchyTree(featureId: string): Promise<{
    feature: { id: string; name: string; featureType: FeatureType };
    parent: { id: string; name: string } | null;
    children: Array<{ id: string; name: string; featureType: FeatureType }>;
    ancestors: Array<{ id: string; name: string }>;
  }> {
    // Get feature
    const [feature] = await db
      .select({
        id: features.id,
        name: features.name,
        featureType: features.featureType,
        parentId: features.parentId,
      })
      .from(features)
      .where(eq(features.id, featureId));

    if (!feature) {
      throw new InvalidDataError(`Feature not found: ${featureId}`, 'featureId');
    }

    // Get parent (if exists)
    let parent = null;
    if (feature.parentId) {
      const [parentFeature] = await db
        .select({ id: features.id, name: features.name })
        .from(features)
        .where(eq(features.id, feature.parentId));

      parent = parentFeature || null;
    }

    // Get children
    const children = await this.getChildren(featureId);

    // Get ancestors (recursive up the tree)
    const ancestors = await this.getAncestors(featureId);

    return {
      feature: {
        id: feature.id,
        name: feature.name,
        featureType: feature.featureType as FeatureType,
      },
      parent,
      children,
      ancestors,
    };
  }

  /**
   * Get all ancestors (parent, grandparent, etc.)
   */
  private async getAncestors(featureId: string): Promise<Array<{ id: string; name: string }>> {
    const result = await db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, name, 0 as depth
        FROM features
        WHERE id = ${featureId}

        UNION ALL

        SELECT f.id, f.parent_id, f.name, a.depth + 1
        FROM features f
        INNER JOIN ancestors a ON f.id = a.parent_id
        WHERE a.depth < 10
      )
      SELECT id, name
      FROM ancestors
      WHERE id != ${featureId}
      ORDER BY depth DESC;
    `);

    return result.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
    }));
  }
}

/**
 * Singleton instance
 */
export const featureHierarchyService = new FeatureHierarchyService(openaiClient);
