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
