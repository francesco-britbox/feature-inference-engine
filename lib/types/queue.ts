/**
 * Queue and job types
 */

export type JobType = 'extract' | 'embed' | 'infer';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  documentId: string;
  jobType: JobType;
  status: JobStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

export interface QueueOptions {
  concurrencyLimit: number;
  timeout: number;
  maxRetries: number;
}
