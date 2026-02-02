/**
 * Edge Case Prompts
 * Template prompts for edge case generation
 * Follows DRY principle - single source of truth for edge case prompts
 */

import type { Feature } from '@/lib/services/enrichment/EnrichmentOrchestrator';

/**
 * Edge Case Prompts
 * Contains all prompt templates for edge cases
 */
export class EdgeCasePrompts {
  /**
   * LLM-based edge case generation prompt
   */
  static generateEdgeCases(feature: Feature, limit: number): string {
    return `You are an expert in OTT platform development with 10+ years experience.

Generate ${limit} critical edge cases for: "${feature.name}"

Feature description: ${feature.description}
Feature evidence: ${feature.evidence.map((e) => e.content).join(', ')}

Focus on:
1. Network issues (offline, slow connection, intermittent, proxy)
2. Device issues (low memory, background mode, interruptions, battery)
3. User errors (invalid input, rapid clicks, back navigation)
4. Platform issues (OS updates, permission changes, storage full)
5. Content issues (corrupt files, missing assets, wrong format)
6. Concurrency issues (multiple sessions, race conditions)

For each edge case, provide:
- scenario: Brief description of the edge case
- expected_behavior: What should happen
- test_case: Given-When-Then format test case
- priority: "high" (crashes/blocks), "medium" (degrades experience), "low" (unlikely)
- category: "network", "device", "user", "content", "security", or "platform"

Return JSON:
{
  "edge_cases": [
    {
      "scenario": "User loses network connection during video playback",
      "expected_behavior": "App buffers available content and displays 'Connecting...' overlay. Resumes playback when connection restored.",
      "test_case": "Given user is watching video at 50% progress, When network disconnects, Then video pauses with loading indicator and buffered content remains available, And video resumes from same position when network reconnects",
      "priority": "high",
      "category": "network"
    }
  ]
}

Return exactly ${limit} edge cases, prioritized by likelihood and impact.`;
  }
}
