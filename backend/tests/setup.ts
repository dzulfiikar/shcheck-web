import { beforeAll, afterAll, afterEach } from 'bun:test';
import { db, closeDatabase } from '../src/db/index.js';
import { scans } from '../src/db/schema.js';
import { sql } from 'drizzle-orm';
import { createRedisConnection } from '../src/queue/connection.js';
import { scanQueue, closeQueue } from '../src/queue/index.js';
import type { Redis } from 'ioredis';

// Test configuration
const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shcheck_test';
const TEST_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Test Redis connection
let testRedis: Redis | null = null;

/**
 * Check if database is available
 */
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Redis is available
 */
async function isRedisAvailable(): Promise<boolean> {
  try {
    if (!testRedis) {
      testRedis = createRedisConnection();
    }
    await testRedis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up database - truncate scans table
 */
async function cleanupDatabase(): Promise<void> {
  try {
    await db.delete(scans);
  } catch (error) {
    console.error('Failed to cleanup database:', error);
  }
}

/**
 * Clean up Redis - clear test queue
 */
async function cleanupRedis(): Promise<void> {
  try {
    await scanQueue.clean(0, 0, 'completed');
    await scanQueue.clean(0, 0, 'failed');
    await scanQueue.clean(0, 0, 'wait');
    await scanQueue.clean(0, 0, 'delayed');
  } catch (error) {
    console.error('Failed to cleanup Redis:', error);
  }
}

// Global test setup
beforeAll(async () => {
  console.log('\n🧪 Setting up test environment...');

  // Check database availability
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    console.warn('⚠️  Database not available. Some tests will be skipped.');
    console.warn(`   Expected at: ${TEST_DATABASE_URL}`);
  } else {
    console.log('✅ Database connected');
  }

  // Check Redis availability
  const redisAvailable = await isRedisAvailable();
  if (!redisAvailable) {
    console.warn('⚠️  Redis not available. Some tests will be skipped.');
    console.warn(`   Expected at: ${TEST_REDIS_URL}`);
  } else {
    console.log('✅ Redis connected');
  }

  // Clean up any existing test data
  if (dbAvailable) {
    await cleanupDatabase();
  }
  if (redisAvailable) {
    await cleanupRedis();
  }

  console.log('🚀 Test environment ready\n');
});

// Global test teardown
afterAll(async () => {
  console.log('\n🧹 Cleaning up test environment...');

  try {
    // Clean up database
    await cleanupDatabase();
    await closeDatabase();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }

  try {
    // Clean up Redis
    await cleanupRedis();
    await closeQueue();
    if (testRedis) {
      await testRedis.quit();
    }
    console.log('✅ Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis:', error);
  }

  console.log('👋 Test environment cleaned up\n');
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data after each test to ensure isolation
  await cleanupDatabase();
  await cleanupRedis();
});

// Export test utilities
export { cleanupDatabase, cleanupRedis, isDatabaseAvailable, isRedisAvailable };
