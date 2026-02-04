import { Elysia, t } from 'elysia';
import { Redis } from 'ioredis';
import { isWorkerRunning } from '../queue/worker.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/**
 * Health check routes for the API
 * Monitors the status of database, Redis, and worker services
 */
export const healthRoutes = new Elysia({ prefix: '/api' })
  // GET /api/health - Health check
  .get(
    '/health',
    async ({ set }) => {
      const timestamp = new Date().toISOString();

      // Check database connection
      let dbHealthy = false;
      try {
        await db.execute(sql`SELECT 1`);
        dbHealthy = true;
      } catch (error) {
        console.error('Health check: Database connection failed:', error);
      }

      // Check Redis connection
      let redisHealthy = false;
      let redisClient: Redis | null = null;
      try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true, // Don't connect immediately
        });

        await redisClient.ping();
        redisHealthy = true;
      } catch (error) {
        console.error('Health check: Redis connection failed:', error);
      } finally {
        if (redisClient) {
          try {
            await redisClient.quit();
          } catch {
            // Ignore errors during cleanup
          }
        }
      }

      // Check worker status
      const workerHealthy = isWorkerRunning();

      // Determine overall health
      const allHealthy = dbHealthy && redisHealthy && workerHealthy;

      if (!allHealthy) {
        set.status = 503; // Service Unavailable
      }

      return {
        status: allHealthy ? ('ok' as const) : ('degraded' as const),
        timestamp,
        services: {
          db: dbHealthy,
          redis: redisHealthy,
          worker: workerHealthy,
        },
      };
    },
    {
      response: t.Object({
        status: t.Union([t.Literal('ok'), t.Literal('degraded')]),
        timestamp: t.String(),
        services: t.Object({
          db: t.Boolean(),
          redis: t.Boolean(),
          worker: t.Boolean(),
        }),
      }),
      detail: {
        summary: 'Health check',
        description: 'Returns the health status of all service dependencies (database, Redis, worker)',
        tags: ['health'],
      },
    }
  );
