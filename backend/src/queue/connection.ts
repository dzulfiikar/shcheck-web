import { Redis } from 'ioredis';

/**
 * Redis connection configuration for BullMQ
 * Uses environment variable REDIS_URL with fallback to localhost
 */

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Redis connection options for reliability
 * - maxRetriesPerRequest: null (required by BullMQ)
 * - enableReadyCheck: false (required by BullMQ)
 * - retryStrategy: exponential backoff for reconnection
 */
export const redisConnectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number): number => {
    // Exponential backoff with max 30 second delay
    const delay = Math.min(times * 50, 30000);
    return delay;
  },
  reconnectOnError: (err: Error): boolean => {
    // Reconnect on READONLY errors (failover scenario)
    const targetError = 'READONLY';
    return err.message.includes(targetError);
  },
};

/**
 * Create a new Redis connection for BullMQ
 * Each BullMQ component (Queue, Worker, QueueScheduler) needs its own connection
 */
export function createRedisConnection(): Redis {
  return new Redis(redisUrl, redisConnectionOptions);
}

/**
 * Shared Redis connection configuration object for BullMQ
 * BullMQ expects connection options or an existing Redis instance
 */
export const redisConnection = {
  url: redisUrl,
  ...redisConnectionOptions,
};
