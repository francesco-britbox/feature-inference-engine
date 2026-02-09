/**
 * Features Graph API
 * GET /api/features/graph - Returns all nodes and links for the graph visualizer
 */

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type {
  GraphData,
  GraphFeatureNode,
  GraphEvidenceNode,
  HierarchyLink,
  EvidenceLink,
} from '@/lib/types/graph';
import type { FeatureType, FeatureStatus, RelationshipType } from '@/lib/types/feature';
import type { EvidenceType } from '@/lib/types/evidence';

interface FeatureRow {
  id: string;
  name: string;
  description: string | null;
  confidence_score: string | null;
  status: string;
  feature_type: string;
  parent_id: string | null;
}

interface EvidenceRelRow {
  feature_id: string;
  evidence_id: string;
  relationship_type: string;
  strength: string | null;
  evidence_type: string;
  content: string;
}

export async function GET(): Promise<NextResponse<GraphData | { error: string }>> {
  try {
    // Query 1: All features (nodes + hierarchy links derived from parentId)
    const featureResult = await db.execute(
      sql`SELECT id, name, description, confidence_score, status, feature_type, parent_id
          FROM features`
    );
    const featureRows = featureResult.rows as unknown as FeatureRow[];

    // Query 2: All feature-evidence relationships joined with evidence
    const evidenceRelResult = await db.execute(
      sql`SELECT
            fe.feature_id,
            fe.evidence_id,
            fe.relationship_type,
            fe.strength,
            e.type AS evidence_type,
            SUBSTRING(e.content, 1, 100) AS content
          FROM feature_evidence fe
          JOIN evidence e ON fe.evidence_id = e.id`
    );
    const evidenceRelRows = evidenceRelResult.rows as unknown as EvidenceRelRow[];

    // Build feature nodes
    const featureNodes: GraphFeatureNode[] = featureRows.map((r) => ({
      id: r.id,
      kind: 'feature' as const,
      name: r.name,
      description: r.description,
      confidenceScore: parseFloat(r.confidence_score ?? '0'),
      status: r.status as FeatureStatus,
      featureType: r.feature_type as FeatureType,
      parentId: r.parent_id,
    }));

    // Derive hierarchy links from parentId
    const hierarchyLinks: HierarchyLink[] = featureNodes
      .filter((n) => n.parentId !== null)
      .map((n) => ({
        source: n.parentId!,
        target: n.id,
        kind: 'hierarchy' as const,
      }));

    // Build evidence nodes (deduplicated) and evidence links
    const evidenceNodeMap = new Map<string, GraphEvidenceNode>();
    const evidenceLinks: EvidenceLink[] = [];

    for (const r of evidenceRelRows) {
      if (!evidenceNodeMap.has(r.evidence_id)) {
        evidenceNodeMap.set(r.evidence_id, {
          id: r.evidence_id,
          kind: 'evidence' as const,
          evidenceType: r.evidence_type as EvidenceType,
          content: r.content,
        });
      }

      evidenceLinks.push({
        source: r.feature_id,
        target: r.evidence_id,
        kind: 'evidence' as const,
        relationshipType: r.relationship_type as RelationshipType,
        strength: parseFloat(r.strength ?? '0'),
      });
    }

    const data: GraphData = {
      nodes: [...featureNodes, ...Array.from(evidenceNodeMap.values())],
      links: [...hierarchyLinks, ...evidenceLinks],
    };

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch graph data',
        details: error instanceof Error ? error.message : String(error),
      } as { error: string; details: string },
      { status: 500 }
    );
  }
}
