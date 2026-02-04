import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import type { CSPEvaluation } from '../services/csp-evaluator.service.js';

// Scan request options
export interface ScanOptions {
  port?: number;
  useGet?: boolean;
  method?: 'HEAD' | 'GET' | 'POST' | 'PUT' | 'DELETE';
  showInformation?: boolean;
  showCaching?: boolean;
  showDeprecated?: boolean;
  cookies?: string;
  headers?: Record<string, string>;
  proxy?: string;
}

// Scan result (matches shcheck JSON output)
export interface ScanResult {
  url: string;
  effectiveUrl: string;
  present: Record<string, string>;
  missing: string[];
  informationDisclosure?: Record<string, string>;
  caching?: Record<string, string>;
  summary: {
    safe: number;
    unsafe: number;
  };
  // CSP evaluation (added post-scan)
  cspEvaluation?: CSPEvaluation;
}

// Scans table definition
export const scans = pgTable(
  'scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    target: varchar('target', { length: 2048 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),

    // Request options
    options: jsonb('options').$type<ScanOptions>(),

    // Result data
    result: jsonb('result').$type<ScanResult>(),
    error: text('error'),

    // Timing
    createdAt: timestamp('created_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),

    // Metrics
    duration: integer('duration'), // milliseconds
  },
  (table) => ({
    statusIdx: index('scan_status_idx').on(table.status),
    createdAtIdx: index('scan_created_at_idx').on(table.createdAt),
    targetIdx: index('scan_target_idx').on(table.target),
  })
);

// Type exports for use in other modules
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
