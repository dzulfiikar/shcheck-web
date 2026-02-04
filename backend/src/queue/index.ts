import { Queue, Job } from 'bullmq';
import { redisConnection } from './connection.js';
import type { ScanOptions } from '../db/schema.js';

/**
 * Scan job data structure
 */
export interface ScanJobData {
  scanId: string;
  target: string;
  options?: ScanOptions;
}

/**
 * Scan job result structure
 */
export interface ScanJobResult {
  success: boolean;
  scanId: string;
}

/**
 * BullMQ Queue for scan jobs
 * Processes security header scans asynchronously
 */
export const scanQueue = new Queue<ScanJobData, ScanJobResult>('scan-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    // Remove completed jobs after 24 hours
    removeOnComplete: {
      age: 24 * 60 * 60, // 24 hours in seconds
      count: 1000,       // Keep last 1000 completed jobs
    },
    // Remove failed jobs after 7 days
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
      count: 500,            // Keep last 500 failed jobs
    },
    // Retry failed jobs up to 3 times with exponential backoff
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Initial delay of 2 seconds
    },
  },
});

/**
 * Add a scan job to the queue
 * @param scanId - The UUID of the scan in the database
 * @param target - The URL/target to scan
 * @param options - Optional scan configuration
 * @returns The created job
 */
export async function addScanJob(
  scanId: string,
  target: string,
  options?: ScanOptions
): Promise<Job<ScanJobData, ScanJobResult>> {
  return scanQueue.add(
    'scan',
    { scanId, target, options },
    {
      jobId: `scan-${scanId}`, // Unique job ID to prevent duplicates
      priority: 1,
    }
  );
}

/**
 * Get job status for a scan
 * @param scanId - The scan UUID
 * @returns Job state and progress information
 */
export async function getScanJobStatus(scanId: string): Promise<{
  state: string;
  progress: number;
  failedReason?: string;
} | null> {
  const jobId = `scan-${scanId}`;
  const job = await scanQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = typeof job.progress === 'number' ? job.progress : 0;

  return {
    state,
    progress,
    failedReason: job.failedReason,
  };
}

/**
 * Remove a job from the queue
 * @param scanId - The scan UUID
 */
export async function removeScanJob(scanId: string): Promise<void> {
  const jobId = `scan-${scanId}`;
  const job = await scanQueue.getJob(jobId);

  if (job) {
    await job.remove();
  }
}

/**
 * Clean up old jobs from the queue
 * Useful for maintenance
 */
export async function cleanupOldJobs(): Promise<void> {
  // Remove completed jobs older than 7 days
  await scanQueue.clean(7 * 24 * 60 * 60 * 1000, 100, 'completed');
  // Remove failed jobs older than 30 days
  await scanQueue.clean(30 * 24 * 60 * 60 * 1000, 100, 'failed');
}

/**
 * Gracefully close the queue connection
 */
export async function closeQueue(): Promise<void> {
  await scanQueue.close();
}
