/**
 * Custom error classes for structured error handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.details = details;
  }
}

export class UnsupportedFileTypeError extends AppError {
  constructor(fileType: string) {
    super(`Unsupported file type: ${fileType}`, 'UNSUPPORTED_FILE_TYPE', 400);
  }
}

export class FileTooLargeError extends AppError {
  constructor(size: number, maxSize: number) {
    super(
      `File size ${size} bytes exceeds maximum ${maxSize} bytes`,
      'FILE_TOO_LARGE',
      400
    );
  }
}

export class DuplicateFileError extends AppError {
  constructor(fileHash: string, public existingDocumentId: string) {
    super(
      `File with hash ${fileHash} already exists`,
      'DUPLICATE_FILE',
      409
    );
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 500);
  }
}

export class QueueError extends AppError {
  constructor(message: string) {
    super(message, 'QUEUE_ERROR', 500);
  }
}

/**
 * Retryable errors - operations that can be retried
 */
export class RetryableError extends AppError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RETRYABLE_ERROR', 503);
    this.retryAfter = retryAfter;
  }
}

/**
 * Configuration errors - invalid configuration or missing settings
 */
export class ConfigurationError extends AppError {
  constructor(message: string, public configKey?: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.configKey = configKey;
  }
}

/**
 * Invalid data errors - data fails validation
 */
export class InvalidDataError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'INVALID_DATA', 400);
    this.field = field;
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends RetryableError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', retryAfter);
    this.code = 'RATE_LIMIT_ERROR';
    this.statusCode = 429;
  }
}

/**
 * Timeout error - operation took too long
 */
export class TimeoutError extends RetryableError {
  constructor(operation: string) {
    super(`Operation timed out: ${operation}`);
    this.code = 'TIMEOUT_ERROR';
    this.statusCode = 504;
  }
}
