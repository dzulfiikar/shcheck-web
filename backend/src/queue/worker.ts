import { Worker, Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { redisConnection } from './connection.js';
import { db } from '../db/index.js';
import { scans } from '../db/schema.js';
import { shcheckService } from '../services/shcheck.service.js';
import { publishScanUpdate } from '../routes/scans.routes.js';
import type { ScanJobData, ScanJobResult } from './index.js';

/**
 * Process a scan job
 * Updates database status throughout the job lifecycle
 */
async function processScanJob(
  job: Job<ScanJobData>
): Promise<ScanJobResult> {
  const { scanId, target, options } = job.data;
  const startTime = Date.now();

  console.log(`[Worker] Starting scan job ${job.id} for target: ${target}`);

  try {
    // Update status to processing
    await db
      .update(scans)
      .set({
        status: 'processing',
        startedAt: new Date(),
      })
      .where(eq(scans.id, scanId));

    // Update job progress
    await job.updateProgress(10);

    // Execute the scan using shcheck service
    const result = await shcheckService.executeScan(target, options);

    await job.updateProgress(80);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Update status to completed with results
    await db
      .update(scans)
      .set({
        status: 'completed',
        result,
        completedAt: new Date(),
        duration,
      })
      .where(eq(scans.id, scanId));

    await job.updateProgress(100);

    // Publish completion event for live updates
    await publishScanUpdate(scanId, 'completed', {
      result,
      duration,
    });

    console.log(
      `[Worker] Completed scan job ${job.id} in ${duration}ms`
    );

    return {
      success: true,
      scanId,
    };
  } catch (error) {
    // Calculate duration even on failure
    const duration = Date.now() - startTime;

    // Extract error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    console.error(
      `[Worker] Failed scan job ${job.id}: ${errorMessage}`
    );

    // Update status to failed with error message
    await db
      .update(scans)
      .set({
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
        duration,
      })
      .where(eq(scans.id, scanId));

    // Publish failure event for live updates
    await publishScanUpdate(scanId, 'failed', {
      error: errorMessage,
      duration,
    });

    // Re-throw to let BullMQ handle retries
    throw error;
  }
}

/**
 * BullMQ Worker for processing scan jobs
 * Handles concurrent scan execution with configurable concurrency
 */
export const scanWorker = new Worker<ScanJobData, ScanJobResult>(
  'scan-queue',
  processScanJob,
  {
    connection: redisConnection,
    concurrency: 3, // Process up to 3 scans concurrently
    limiter: {
      max: 10, // Max 10 jobs per duration window
      duration: 60000, // Per 60 seconds (rate limiting)
    },
  }
);

/**
 * Worker event handlers for monitoring and logging
 */
scanWorker.on('completed', (job, result) => {
  console.log(
    `[Worker] Job ${job.id} completed successfully:`,
    result
  );
});

scanWorker.on('failed', (job, err) => {
  console.error(
    `[Worker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
    err.message
  );
});

scanWorker.on('progress', (job, progress) => {
  console.log(`[Worker] Job ${job.id} progress: ${progress}%`);
});

scanWorker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

/**
 * Gracefully close the worker
 * Waits for current jobs to complete before closing
 */
export async function closeWorker(): Promise<void> {
  console.log('[Worker] Closing worker...');
  await scanWorker.close();
  console.log('[Worker] Worker closed');
}

/**
 * Check if worker is running and healthy
 */
export function isWorkerRunning(): boolean {
  return scanWorker.isRunning();
}
