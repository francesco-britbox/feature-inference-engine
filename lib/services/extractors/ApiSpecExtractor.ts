/**
 * ApiSpecExtractor
 * Extracts endpoints and payloads from API specifications (JSON/YAML)
 * Single Responsibility: API spec parsing only
 */

import fs from 'fs/promises';
import yaml from 'js-yaml';
import type { Evidence, Extractor } from '@/lib/types/evidence';
import { logger } from '@/lib/utils/logger';

export class ApiSpecExtractor implements Extractor {
  private readonly log = logger.child({ extractor: 'ApiSpecExtractor' });
  /**
   * Extract evidence from API specification file
   * @param filePath Path to JSON or YAML file
   * @param documentId Document UUID
   * @returns Array of evidence (endpoints, payloads)
   */
  async extract(filePath: string, documentId: string): Promise<Evidence[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const extension = filePath.split('.').pop()?.toLowerCase();

      let spec: unknown;

      // Parse based on file type
      if (extension === 'json') {
        spec = JSON.parse(content);
      } else if (extension === 'yaml' || extension === 'yml') {
        spec = yaml.load(content);
      } else {
        this.log.error({ filePath, extension }, 'Unsupported API spec format');
        return [];
      }

      // Detect spec format (Postman vs OpenAPI)
      if (this.isPostmanCollection(spec)) {
        return this.extractFromPostman(spec as Record<string, unknown>, documentId);
      } else if (this.isOpenAPISpec(spec)) {
        return this.extractFromOpenAPI(spec as Record<string, unknown>, documentId);
      } else if (this.isCustomFormat(spec)) {
        return this.extractFromCustomFormat(spec as Record<string, unknown>, documentId);
      }

      this.log.error({ filePath }, 'Unknown API spec format');
      return [];
    } catch (error) {
      this.log.error(
        {
          documentId,
          filePath,
          error: error instanceof Error ? error.message : String(error),
        },
        'API spec extraction failed'
      );
      return [];
    }
  }

  /**
   * Check if spec is Postman collection
   */
  private isPostmanCollection(spec: unknown): spec is Record<string, unknown> {
    return !!(spec && typeof spec === 'object' && 'item' in spec && Array.isArray((spec as Record<string, unknown>).item));
  }

  /**
   * Check if spec is OpenAPI
   */
  private isOpenAPISpec(spec: unknown): spec is Record<string, unknown> {
    return !!(spec && typeof spec === 'object' && ('openapi' in spec || 'swagger' in spec) && 'paths' in spec);
  }

  /**
   * Check if spec is custom format (like our test fixture)
   */
  private isCustomFormat(spec: unknown): spec is Record<string, unknown> {
    return !!(spec && typeof spec === 'object' && 'endpoints' in spec && Array.isArray((spec as Record<string, unknown>).endpoints));
  }

  /**
   * Extract from Postman collection
   */
  private extractFromPostman(collection: Record<string, unknown>, documentId: string): Evidence[] {
    const evidence: Evidence[] = [];

    const items = collection.item as Record<string, unknown>[];
    for (const item of items) {
      const request = item.request as Record<string, unknown> | undefined;
      if (!request) continue;

      // Extract endpoint
      evidence.push({
        documentId,
        type: 'endpoint',
        content: `${request.method} ${request.url}`,
        rawData: {
          method: request.method,
          path: request.url,
          name: item.name,
        },
      });

      // Extract request payload
      const body = request.body as Record<string, unknown> | undefined;
      if (body?.raw) {
        try {
          const bodySchema = JSON.parse(body.raw as string);
          evidence.push({
            documentId,
            type: 'payload',
            content: `Request payload for ${item.name}`,
            rawData: {
              direction: 'request',
              schema: bodySchema,
            },
          });
        } catch {
          // Skip if body is not valid JSON
        }
      }
    }

    return evidence;
  }

  /**
   * Extract from OpenAPI specification
   */
  private extractFromOpenAPI(spec: Record<string, unknown>, documentId: string): Evidence[] {
    const evidence: Evidence[] = [];

    const paths = (spec.paths as Record<string, unknown>) || {};
    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(methods as Record<string, unknown>)) {
        if (typeof operation !== 'object' || operation === null) continue;

        const operationObj = operation as Record<string, unknown>;

        // Extract endpoint
        evidence.push({
          documentId,
          type: 'endpoint',
          content: `${method.toUpperCase()} ${path}`,
          rawData: {
            method: method.toUpperCase(),
            path,
            summary: operationObj.summary,
            description: operationObj.description,
          },
        });

        // Extract request schema
        const requestBody = operationObj.requestBody as Record<string, unknown> | undefined;
        if (requestBody) {
          const content = requestBody.content as Record<string, unknown> | undefined;
          const schema = content?.['application/json'] as Record<string, unknown> | undefined;
          if (schema?.schema) {
            evidence.push({
              documentId,
              type: 'payload',
              content: `Request schema for ${path}`,
              rawData: {
                direction: 'request',
                schema: schema.schema,
              },
            });
          }
        }

        // Extract response schemas
        const responses = (operationObj.responses as Record<string, unknown>) || {};
        for (const [status, response] of Object.entries(responses)) {
          const responseData = response as Record<string, unknown>;
          const content = responseData.content as Record<string, unknown> | undefined;
          const schema = content?.['application/json'] as Record<string, unknown> | undefined;
          if (schema?.schema) {
            evidence.push({
              documentId,
              type: 'payload',
              content: `Response schema (${status}) for ${path}`,
              rawData: {
                direction: 'response',
                statusCode: status,
                schema: schema.schema,
              },
            });
          }
        }
      }
    }

    return evidence;
  }

  /**
   * Extract from custom format (like our test fixtures)
   */
  private extractFromCustomFormat(spec: Record<string, unknown>, documentId: string): Evidence[] {
    const evidence: Evidence[] = [];

    const endpoints = (spec.endpoints as Record<string, unknown>[]) || [];
    for (const endpoint of endpoints) {
      // Extract endpoint
      evidence.push({
        documentId,
        type: 'endpoint',
        content: `${endpoint.method} ${endpoint.path}`,
        rawData: {
          method: endpoint.method,
          path: endpoint.path,
          description: endpoint.description,
        },
      });

      // Extract request schema
      const request = endpoint.request as Record<string, unknown> | undefined;
      if (request?.body) {
        evidence.push({
          documentId,
          type: 'payload',
          content: `Request schema for ${endpoint.path}`,
          rawData: {
            direction: 'request',
            schema: request.body,
          },
        });
      }

      // Extract response schemas
      const responses = (endpoint.responses as Record<string, unknown>) || {};
      for (const [status, response] of Object.entries(responses)) {
        const responseData = response as Record<string, unknown>;
        if (responseData.body) {
          evidence.push({
            documentId,
            type: 'payload',
            content: `Response schema (${status}) for ${endpoint.path}`,
            rawData: {
              direction: 'response',
              statusCode: status,
              schema: responseData.body,
              description: responseData.description,
            },
          });
        }
      }
    }

    return evidence;
  }
}

/**
 * Singleton instance
 */
export const apiSpecExtractor = new ApiSpecExtractor();
