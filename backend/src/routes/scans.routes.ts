import { Elysia, t } from 'elysia';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { scans } from '../db/schema.js';
import {
  scanQueue,
  getScanJobStatus,
  removeScanJob,
} from '../queue/index.js';
import { createRedisConnection } from '../queue/connection.js';
import { pdfService } from '../services/pdf.service.js';
import type {
  ScanOptions,
  ScanStatus,
  BulkCreateScanResponse,
} from '../types/scan.types.js';

/**
 * Redis pub/sub for live scan updates
 */
const redisPub = createRedisConnection();
const redisSub = createRedisConnection();

/**
 * Transform a database scan to API response format
 */
function transformScanResponse(scan: typeof scans.$inferSelect) {
  return {
    id: scan.id,
    target: scan.target,
    status: scan.status as ScanStatus,
    options: scan.options,
    result: scan.result,
    error: scan.error,
    createdAt: scan.createdAt?.toISOString() || new Date().toISOString(),
    startedAt: scan.startedAt?.toISOString() || null,
    completedAt: scan.completedAt?.toISOString() || null,
    duration: scan.duration,
  };
}

/**
 * Publish a scan status update to Redis
 */
export async function publishScanUpdate(
  scanId: string,
  status: string,
  data?: Record<string, unknown>
): Promise<void> {
  const message = JSON.stringify({
    scanId,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  });
  await redisPub.publish(`scan:${scanId}`, message);
}

/**
 * Scan routes for the API
 * Handles CRUD operations for security header scans
 */
export const scansRoutes = new Elysia({ prefix: '/api/scans' })
  // POST /api/scans - Create new scan job
  .post(
    '/',
    async ({ body, set }) => {
      try {
        // Build scan options from body
        const options: ScanOptions = {
          port: body.port,
          useGet: body.useGet,
          method: body.method,
          showInformation: body.showInformation,
          showCaching: body.showCaching,
          showDeprecated: body.showDeprecated,
          cookies: body.cookies,
          headers: body.headers,
          proxy: body.proxy,
        };

        // Remove undefined values
        Object.keys(options).forEach((key) => {
          if (options[key as keyof ScanOptions] === undefined) {
            delete options[key as keyof ScanOptions];
          }
        });

        // Insert scan into database
        const [scan] = await db
          .insert(scans)
          .values({
            target: body.target,
            status: 'pending',
            options: Object.keys(options).length > 0 ? options : undefined,
          })
          .returning();

        // Add job to queue
        await scanQueue.add(
          'scan',
          {
            scanId: scan.id,
            target: body.target,
            options: Object.keys(options).length > 0 ? options : undefined,
          },
          { jobId: `scan-${scan.id}` }
        );

        set.status = 201;
        return {
          jobId: scan.id,
          status: 'pending' as const,
        };
      } catch (error) {
        console.error('Error creating scan:', error);
        set.status = 500;
        return {
          error: 'Failed to create scan job',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        target: t.String({
          minLength: 1,
          maxLength: 2048,
          format: 'uri',
        }),
        port: t.Optional(t.Number({ minimum: 1, maximum: 65535 })),
        useGet: t.Optional(t.Boolean()),
        method: t.Optional(
          t.Union([
            t.Literal('HEAD'),
            t.Literal('GET'),
            t.Literal('POST'),
            t.Literal('PUT'),
            t.Literal('DELETE'),
          ])
        ),
        showInformation: t.Optional(t.Boolean()),
        showCaching: t.Optional(t.Boolean()),
        showDeprecated: t.Optional(t.Boolean()),
        cookies: t.Optional(t.String()),
        headers: t.Optional(t.Record(t.String(), t.String())),
        proxy: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Create a new scan job',
        description: 'Creates a new security header scan job and adds it to the processing queue',
        tags: ['scans'],
      },
    }
  )

  // POST /api/scans/bulk - Create multiple scan jobs
  .post(
    '/bulk',
    async ({ body, set }) => {
      try {
        // Parse targets from newline-separated string
        const targets = body.targets
          .split('\n')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        if (targets.length === 0) {
          set.status = 400;
          return {
            error: 'No valid targets provided',
            message: 'Please provide at least one URL separated by newlines',
          };
        }

        // Build scan options from body
        const options: ScanOptions = {
          port: body.port,
          useGet: body.useGet,
          method: body.method,
          showInformation: body.showInformation,
          showCaching: body.showCaching,
          showDeprecated: body.showDeprecated,
          cookies: body.cookies,
          headers: body.headers,
          proxy: body.proxy,
        };

        // Remove undefined values
        Object.keys(options).forEach((key) => {
          if (options[key as keyof ScanOptions] === undefined) {
            delete options[key as keyof ScanOptions];
          }
        });

        const jobs: BulkCreateScanResponse['jobs'] = [];
        const errors: BulkCreateScanResponse['errors'] = [];

        // Create scans for each target
        for (const target of targets) {
          try {
            // Validate URL format
            new URL(target);

            // Insert scan into database
            const [scan] = await db
              .insert(scans)
              .values({
                target,
                status: 'pending',
                options: Object.keys(options).length > 0 ? options : undefined,
              })
              .returning();

            // Add job to queue
            await scanQueue.add(
              'scan',
              {
                scanId: scan.id,
                target,
                options: Object.keys(options).length > 0 ? options : undefined,
              },
              { jobId: `scan-${scan.id}` }
            );

            jobs.push({
              jobId: scan.id,
              status: 'pending' as const,
            });
          } catch (err) {
            errors.push({
              target,
              error: err instanceof Error ? err.message : 'Invalid URL or failed to create scan',
            });
          }
        }

        set.status = 201;
        return {
          jobs,
          total: targets.length,
          created: jobs.length,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        console.error('Error creating bulk scans:', error);
        set.status = 500;
        return {
          error: 'Failed to create scan jobs',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        targets: t.String({
          minLength: 1,
          description: 'Newline-separated list of URLs to scan',
        }),
        port: t.Optional(t.Number({ minimum: 1, maximum: 65535 })),
        useGet: t.Optional(t.Boolean()),
        method: t.Optional(
          t.Union([
            t.Literal('HEAD'),
            t.Literal('GET'),
            t.Literal('POST'),
            t.Literal('PUT'),
            t.Literal('DELETE'),
          ])
        ),
        showInformation: t.Optional(t.Boolean()),
        showCaching: t.Optional(t.Boolean()),
        showDeprecated: t.Optional(t.Boolean()),
        cookies: t.Optional(t.String()),
        headers: t.Optional(t.Record(t.String(), t.String())),
        proxy: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Create multiple scan jobs',
        description: 'Creates multiple security header scan jobs from newline-separated URLs and adds them to the processing queue',
        tags: ['scans'],
      },
    }
  )

  // GET /api/scans - List scans (paginated)
  .get(
    '/',
    async ({ query, set }) => {
      try {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const status = query.status;
        const search = query.search;
        const offset = (page - 1) * limit;

        // Build where conditions
        const whereConditions = [];
        if (status) {
          whereConditions.push(eq(scans.status, status));
        }
        if (search) {
          whereConditions.push(
            sql`${scans.target} ILIKE ${`%${search}%`}`
          );
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(scans)
          .where(and(...whereConditions));
        const total = countResult[0]?.count || 0;

        // Get paginated results
        const results = await db
          .select()
          .from(scans)
          .where(and(...whereConditions))
          .orderBy(desc(scans.createdAt))
          .limit(limit)
          .offset(offset);

        return {
          data: results.map(transformScanResponse),
          total,
          page,
          limit,
        };
      } catch (error) {
        console.error('Error listing scans:', error);
        set.status = 500;
        return {
          error: 'Failed to list scans',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
        status: t.Optional(
          t.Union([
            t.Literal('pending'),
            t.Literal('processing'),
            t.Literal('completed'),
            t.Literal('failed'),
          ])
        ),
        search: t.Optional(t.String()),
      }),
      detail: {
        summary: 'List all scans',
        description: 'Returns a paginated list of security header scans with optional status and search filtering',
        tags: ['scans'],
      },
    }
  )

  // GET /api/scans/:id - Get scan by ID
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        const result = await db
          .select()
          .from(scans)
          .where(eq(scans.id, params.id))
          .limit(1);

        if (result.length === 0) {
          set.status = 404;
          return {
            error: 'Scan not found',
            message: `No scan found with ID: ${params.id}`,
          };
        }

        return transformScanResponse(result[0]);
      } catch (error) {
        console.error('Error getting scan:', error);
        set.status = 500;
        return {
          error: 'Failed to get scan',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        summary: 'Get scan by ID',
        description: 'Returns detailed information about a specific scan including results if completed',
        tags: ['scans'],
      },
    }
  )

  // GET /api/scans/:id/status - Poll job status
  .get(
    '/:id/status',
    async ({ params, set }) => {
      try {
        // First check if scan exists in database
        const result = await db
          .select({
            id: scans.id,
            status: scans.status,
          })
          .from(scans)
          .where(eq(scans.id, params.id))
          .limit(1);

        if (result.length === 0) {
          set.status = 404;
          return {
            error: 'Scan not found',
            message: `No scan found with ID: ${params.id}`,
          };
        }

        const scan = result[0];

        // If scan is pending or processing, check queue for progress
        if (scan.status === 'pending' || scan.status === 'processing') {
          const jobStatus = await getScanJobStatus(params.id);

          if (jobStatus) {
            return {
              status: scan.status,
              progress: jobStatus.progress,
            };
          }
        }

        // Return status without progress for completed/failed scans
        return {
          status: scan.status,
        };
      } catch (error) {
        console.error('Error getting scan status:', error);
        set.status = 500;
        return {
          error: 'Failed to get scan status',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        summary: 'Get scan job status',
        description: 'Returns the current status and progress of a scan job for polling',
        tags: ['scans'],
      },
    }
  )

  // DELETE /api/scans/:id - Delete scan
  .delete(
    '/:id',
    async ({ params, set }) => {
      try {
        // Check if scan exists
        const result = await db
          .select({ id: scans.id })
          .from(scans)
          .where(eq(scans.id, params.id))
          .limit(1);

        if (result.length === 0) {
          set.status = 404;
          return {
            error: 'Scan not found',
            message: `No scan found with ID: ${params.id}`,
          };
        }

        // Remove from queue if still pending/processing
        await removeScanJob(params.id);

        // Delete from database
        await db.delete(scans).where(eq(scans.id, params.id));

        set.status = 204;
        return;
      } catch (error) {
        console.error('Error deleting scan:', error);
        set.status = 500;
        return {
          error: 'Failed to delete scan',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        summary: 'Delete a scan',
        description: 'Deletes a scan and removes it from the processing queue if pending',
        tags: ['scans'],
      },
    }
  )

  // POST /api/scans/bulk-delete - Bulk delete scans
  .post(
    '/bulk-delete',
    async ({ body, set }) => {
      try {
        const { ids } = body;

        if (!ids || ids.length === 0) {
          set.status = 400;
          return {
            error: 'No scan IDs provided',
            message: 'Please provide at least one scan ID to delete',
          };
        }

        // Remove from queue if still pending/processing
        for (const id of ids) {
          await removeScanJob(id);
        }

        // Delete from database
        const result = await db
          .delete(scans)
          .where(sql`${scans.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
          .returning({ id: scans.id });

        return {
          deleted: result.length,
          ids: result.map(r => r.id),
        };
      } catch (error) {
        console.error('Error bulk deleting scans:', error);
        set.status = 500;
        return {
          error: 'Failed to delete scans',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        ids: t.Array(t.String({ format: 'uuid' })),
      }),
      detail: {
        summary: 'Bulk delete scans',
        description: 'Deletes multiple scans at once and removes them from the processing queue if pending',
        tags: ['scans'],
      },
    }
  )

  // GET /api/scans/:id/subscribe - SSE endpoint for live updates
  .get(
    '/:id/subscribe',
    async function* ({ params, set }) {
      const scanId = params.id;

      // Check if scan exists
      const result = await db
        .select({ id: scans.id, status: scans.status })
        .from(scans)
        .where(eq(scans.id, scanId))
        .limit(1);

      if (result.length === 0) {
        set.status = 404;
        yield JSON.stringify({
          error: 'Scan not found',
          message: `No scan found with ID: ${scanId}`,
        });
        return;
      }

      const scan = result[0];

      // Set SSE headers
      set.headers['content-type'] = 'text/event-stream';
      set.headers['cache-control'] = 'no-cache';
      set.headers['connection'] = 'keep-alive';

      // Send initial status
      yield { status: scan.status };

      // If already completed or failed, close stream
      if (scan.status === 'completed' || scan.status === 'failed') {
        return;
      }

      // For pending/processing scans, wait for updates
      const channel = `scan:${scanId}`;

      // Create a promise that resolves when we get an update
      let resolveUpdate: ((value: string) => void) | null = null;
      let isSubscribed = true;

      const messageHandler = (receivedChannel: string, message: string) => {
        if (receivedChannel === channel && resolveUpdate) {
          resolveUpdate(message);
        }
      };

      // Subscribe to Redis
      await redisSub.subscribe(channel);
      redisSub.on('message', messageHandler);

      try {
        // Keep streaming until scan completes or fails
        while (isSubscribed) {
          const message = await new Promise<string>((resolve) => {
            resolveUpdate = resolve;
            // Timeout after 30 seconds to keep connection alive
            setTimeout(() => resolve(''), 30000);
          });

          if (!message) {
            // Send keep-alive - just yield empty object
            yield {};
            continue;
          }

          try {
            const data = JSON.parse(message);
            yield data;

            // Close stream if scan is completed or failed
            if (data.status === 'completed' || data.status === 'failed') {
              isSubscribed = false;
            }
          } catch (err) {
            console.error('Error parsing scan update:', err);
          }
        }
      } finally {
        // Cleanup
        redisSub.unsubscribe(channel);
        redisSub.off('message', messageHandler);
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        summary: 'Subscribe to scan updates (SSE)',
        description: 'Server-Sent Events endpoint for real-time scan status updates',
        tags: ['scans'],
      },
    }
  )

  // GET /api/scans/:id/pdf - Download scan report as PDF
  .get(
    '/:id/pdf',
    async ({ params, set }) => {
      try {
        // Get scan from database
        const result = await db
          .select()
          .from(scans)
          .where(eq(scans.id, params.id))
          .limit(1);

        if (result.length === 0) {
          set.status = 404;
          return {
            error: 'Scan not found',
            message: `No scan found with ID: ${params.id}`,
          };
        }

        const scan = transformScanResponse(result[0]);

        // Generate PDF
        const pdfBuffer = await pdfService.generateScanReport(scan);

        // Set response headers for PDF download
        set.headers['content-type'] = 'application/pdf';
        set.headers['content-disposition'] = `attachment; filename="scan-${params.id.slice(0, 8)}.pdf"`;

        return pdfBuffer;
      } catch (error) {
        console.error('Error generating PDF:', error);
        set.status = 500;
        return {
          error: 'Failed to generate PDF',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        summary: 'Download scan report as PDF',
        description: 'Generates and downloads a PDF report for a specific scan',
        tags: ['scans'],
      },
    }
  )

  // POST /api/scans/bulk-pdf - Download bulk scan reports as PDF
  .post(
    '/bulk-pdf',
    async ({ body, set }) => {
      try {
        const { ids } = body;

        if (!ids || ids.length === 0) {
          set.status = 400;
          return {
            error: 'No scan IDs provided',
            message: 'Please provide at least one scan ID',
          };
        }

        // Get scans from database
        const results = await db
          .select()
          .from(scans)
          .where(sql`${scans.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(desc(scans.createdAt));

        if (results.length === 0) {
          set.status = 404;
          return {
            error: 'No scans found',
            message: 'No scans found with the provided IDs',
          };
        }

        const scansList = results.map(transformScanResponse);

        // Generate bulk PDF
        const pdfBuffer = await pdfService.generateBulkReport(scansList);

        // Set response headers for PDF download
        set.headers['content-type'] = 'application/pdf';
        set.headers['content-disposition'] = `attachment; filename="scans-report-${new Date().toISOString().split('T')[0]}.pdf"`;

        return pdfBuffer;
      } catch (error) {
        console.error('Error generating bulk PDF:', error);
        set.status = 500;
        return {
          error: 'Failed to generate PDF',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        ids: t.Array(t.String({ format: 'uuid' })),
      }),
      detail: {
        summary: 'Download bulk scan reports as PDF',
        description: 'Generates and downloads a combined PDF report for multiple scans',
        tags: ['scans'],
      },
    }
  );
