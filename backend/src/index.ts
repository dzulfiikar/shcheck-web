import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { closeWorker, isWorkerRunning } from './queue/worker.js';
import { closeQueue } from './queue/index.js';
import { closeDatabase } from './db/index.js';
import { scansRoutes } from './routes/scans.routes.js';
import { healthRoutes } from './routes/health.routes.js';

// Initialize the worker (import triggers worker creation)
import './queue/worker.js';

const app = new Elysia()
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: 'shcheck API',
        version: '0.1.0',
        description: 'Security Header Checker API',
      },
    },
  }))
  .get('/', () => ({ message: 'shcheck API is running' }))
  .use(scansRoutes)
  .use(healthRoutes)
  .listen(process.env.PORT || 3001);

// Graceful shutdown handlers
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close worker first (wait for current jobs)
    await closeWorker();

    // Close queue
    await closeQueue();

    // Close database connection
    await closeDatabase();

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log(
  `🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(`📊 Worker status: ${isWorkerRunning() ? 'running' : 'stopped'}`);

export type App = typeof app;