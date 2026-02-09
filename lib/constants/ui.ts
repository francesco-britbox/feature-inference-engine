/**
 * UI Constants
 * Centralized UI configuration constants
 */

/**
 * Evidence Type Color Mappings
 * Maps evidence types to TailwindCSS color classes
 */
export const EVIDENCE_TYPE_COLORS: Record<string, string> = {
  ui_element: 'bg-blue-100 text-blue-800',
  flow: 'bg-purple-100 text-purple-800',
  endpoint: 'bg-green-100 text-green-800',
  payload: 'bg-yellow-100 text-yellow-800',
  requirement: 'bg-orange-100 text-orange-800',
  edge_case: 'bg-red-100 text-red-800',
  acceptance_criteria: 'bg-teal-100 text-teal-800',
  bug: 'bg-pink-100 text-pink-800',
  constraint: 'bg-gray-100 text-gray-800',
};

/**
 * Feature Status Badge Variants
 * Maps feature status to badge component variants
 */
export const FEATURE_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  candidate: 'secondary',
  confirmed: 'default',
  rejected: 'outline',
};

/**
 * Feature Status Card Border Colors
 * Maps feature status to border and background color classes
 */
export const FEATURE_STATUS_COLORS: Record<string, string> = {
  candidate: 'border-yellow-200 bg-yellow-50',
  confirmed: 'border-green-200 bg-green-50',
  rejected: 'border-gray-200 bg-gray-50',
};

/**
 * File Upload Limits
 * Configuration for file upload constraints
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_FILES: 20,
  MAX_SIZE_MB: 500,
  MAX_SIZE_BYTES: 500 * 1024 * 1024, // 500MB in bytes
} as const;

/**
 * Accepted File Types
 * MIME type mappings for file upload
 */
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  'text/yaml': ['.yaml', '.yml'],
  'text/markdown': ['.md'],
} as const;

/**
 * Evidence Type List
 * Array of all valid evidence types
 */
export const EVIDENCE_TYPES = [
  'ui_element',
  'flow',
  'endpoint',
  'payload',
  'requirement',
  'edge_case',
  'acceptance_criteria',
  'bug',
  'constraint',
] as const;

/**
 * Graph Visualization Colors (hex for D3 SVG attributes)
 */

/** Feature type node fill colors */
export const GRAPH_FEATURE_TYPE_COLORS: Record<string, string> = {
  epic: '#3b82f6',    // blue-500
  story: '#22c55e',   // green-500
  task: '#f59e0b',    // amber-500
};

/** Relationship type link stroke colors */
export const GRAPH_RELATIONSHIP_COLORS: Record<string, string> = {
  implements: '#22c55e', // green-500
  supports: '#3b82f6',  // blue-500
  constrains: '#ef4444', // red-500
  extends: '#a855f7',   // purple-500
};

/** General graph color defaults */
export const GRAPH_COLORS = {
  hierarchyLink: '#94a3b8',   // slate-400
  evidenceNode: '#9ca3af',    // gray-400
  nodeStroke: '#ffffff',       // white border on nodes
  labelColor: '#1e293b',      // slate-800
  tooltipBg: '#0f172a',       // slate-900
  tooltipText: '#f8fafc',     // slate-50
} as const;
