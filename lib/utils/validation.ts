/**
 * Validation schemas using Zod
 * Ensures type safety and runtime validation
 */

import { z } from 'zod';

/**
 * Schema for Evidence rawData field
 * Validates that rawData is a valid JSON object
 */
export const evidenceRawDataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Schema for extracted evidence metadata
 */
export const extractedEvidenceMetadataSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Validate evidence rawData
 * @param rawData Raw data to validate
 * @returns Validated rawData or throws ValidationError
 */
export function validateEvidenceRawData(
  rawData: unknown
): Record<string, unknown> | undefined {
  const result = evidenceRawDataSchema.safeParse(rawData);

  if (!result.success) {
    throw new Error(
      `Invalid evidence rawData: ${result.error.issues.map((i) => i.message).join(', ')}`
    );
  }

  return result.data;
}

/**
 * Schema for email validation
 */
export const emailSchema = z.string().email();

/**
 * Validate email address
 * @param email Email to validate
 * @returns True if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

/**
 * Schema for UUID validation
 */
export const uuidSchema = z.string().uuid();

/**
 * Validate UUID
 * @param uuid UUID to validate
 * @returns True if valid, false otherwise
 */
export function validateUuid(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}
