/**
 * Feature output types and interfaces
 * Defines structures for generated artifacts (epics, API contracts, requirements, acceptance criteria)
 */

/**
 * Output type enum
 * Matches database constraint in feature_outputs table
 */
export type OutputType =
  | 'epic'
  | 'story'
  | 'acceptance_criteria'
  | 'api_contract'
  | 'requirements';

/**
 * HTTP method for API endpoints
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Authentication type for API endpoints
 */
export type AuthType = 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2';

/**
 * Schema field definition
 */
export interface SchemaField {
  type: string;
  format?: string;
  required?: boolean;
  description?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  properties?: Record<string, SchemaField>;
  items?: SchemaField;
}

/**
 * API endpoint request schema
 */
export interface RequestSchema {
  body?: Record<string, SchemaField>;
  query?: Record<string, SchemaField>;
  headers?: Record<string, SchemaField>;
  path?: Record<string, SchemaField>;
}

/**
 * API endpoint response schema
 */
export interface ResponseSchema {
  [statusCode: string]: Record<string, SchemaField> | string;
}

/**
 * API endpoint definition
 */
export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: AuthType;
  request?: RequestSchema;
  response: ResponseSchema;
  errors?: string[];
}

/**
 * Complete API contract for a feature
 */
export interface ApiContract {
  endpoints: ApiEndpoint[];
  authentication?: {
    type: AuthType;
    description: string;
  };
  errorHandling?: string[];
  notes?: string[];
}

/**
 * Requirements document structure
 */
export interface RequirementsDoc {
  title: string;
  summary: string;
  functionalRequirements: string[];
  nonFunctionalRequirements?: string[];
  constraints?: string[];
  assumptions?: string[];
  dependencies?: string[];
}

/**
 * Acceptance criteria in Given/When/Then format
 */
export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

/**
 * Acceptance criteria collection
 */
export interface AcceptanceCriteria {
  scenarios: AcceptanceCriterion[];
  edgeCases?: string[];
  notes?: string[];
}

/**
 * Feature output record
 * Matches database feature_outputs table structure
 */
export interface FeatureOutput {
  id: string;
  featureId: string;
  outputType: OutputType;
  content: ApiContract | RequirementsDoc | AcceptanceCriteria;
  generatedAt: Date;
  version: number;
}

/**
 * Grouped evidence by type
 * Used internally for assembly
 */
export interface GroupedEvidence {
  endpoint: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  payload: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  requirement: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  edge_case: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  acceptance_criteria: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  ui_element: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  flow: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  bug: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
  constraint: Array<{ id: string; content: string; rawData?: Record<string, unknown> }>;
}
