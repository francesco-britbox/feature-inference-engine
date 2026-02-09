/**
 * Graph visualization types
 * Shared interfaces for the feature relation graph
 */

import type { FeatureType, FeatureStatus, RelationshipType } from './feature';
import type { EvidenceType } from './evidence';

/** Feature node in the graph */
export interface GraphFeatureNode {
  id: string;
  kind: 'feature';
  name: string;
  description: string | null;
  confidenceScore: number;
  status: FeatureStatus;
  featureType: FeatureType;
  parentId: string | null;
}

/** Evidence node in the graph */
export interface GraphEvidenceNode {
  id: string;
  kind: 'evidence';
  evidenceType: EvidenceType;
  content: string; // truncated to 100 chars
}

export type GraphNode = GraphFeatureNode | GraphEvidenceNode;

/** Hierarchy link between parent and child features */
export interface HierarchyLink {
  source: string;
  target: string;
  kind: 'hierarchy';
}

/** Evidence link between a feature and an evidence item */
export interface EvidenceLink {
  source: string; // featureId
  target: string; // evidenceId
  kind: 'evidence';
  relationshipType: RelationshipType;
  strength: number;
}

export type GraphLink = HierarchyLink | EvidenceLink;

/** Full graph response from the API */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Filter state for the graph controls */
export interface GraphFilters {
  showHierarchyLinks: boolean;
  showEvidenceLinks: boolean;
  showEvidenceNodes: boolean;
  featureTypes: Record<FeatureType, boolean>;
}
