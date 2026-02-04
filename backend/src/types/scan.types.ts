import { z } from 'zod';

/**
 * HTTP methods supported by shcheck
 */
export const HttpMethodSchema = z.enum(['HEAD', 'GET', 'POST', 'PUT', 'DELETE']);

/**
 * Scan status values
 */
export const ScanStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

/**
 * Scan options for creating a new scan
 * Matches the ScanOptions interface in db/schema.ts
 */
export const ScanOptionsSchema = z
  .object({
    port: z.number().int().min(1).max(65535).optional(),
    useGet: z.boolean().optional(),
    method: HttpMethodSchema.optional(),
    showInformation: z.boolean().optional(),
    showCaching: z.boolean().optional(),
    showDeprecated: z.boolean().optional(),
    cookies: z.string().optional(),
    headers: z.record(z.string()).optional(),
    proxy: z.string().optional(),
  })
  .strict();

/**
 * Create scan request body
 */
export const CreateScanRequestSchema = z
  .object({
    target: z.string().url().min(1).max(2048),
    port: z.number().int().min(1).max(65535).optional(),
    useGet: z.boolean().optional(),
    method: HttpMethodSchema.optional(),
    showInformation: z.boolean().optional(),
    showCaching: z.boolean().optional(),
    showDeprecated: z.boolean().optional(),
    cookies: z.string().optional(),
    headers: z.record(z.string()).optional(),
    proxy: z.string().optional(),
  })
  .strict();

/**
 * Scan result summary
 */
export const ScanSummarySchema = z.object({
  safe: z.number(),
  unsafe: z.number(),
});

/**
 * Scan result structure
 * Matches the ScanResult interface in db/schema.ts
 */
export const ScanResultSchema = z.object({
  url: z.string(),
  effectiveUrl: z.string(),
  present: z.record(z.string()),
  missing: z.array(z.string()),
  informationDisclosure: z.record(z.string()).optional(),
  caching: z.record(z.string()).optional(),
  summary: ScanSummarySchema,
});

/**
 * Scan response from database
 */
export const ScanResponseSchema = z.object({
  id: z.string().uuid(),
  target: z.string(),
  status: ScanStatusSchema,
  options: ScanOptionsSchema.optional().nullable(),
  result: ScanResultSchema.optional().nullable(),
  error: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  duration: z.number().optional().nullable(),
});

/**
 * Create scan response
 */
export const CreateScanResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.literal('pending'),
});

/**
 * Bulk create scan response
 */
export const BulkCreateScanResponseSchema = z.object({
  jobs: z.array(CreateScanResponseSchema),
  total: z.number(),
  created: z.number(),
  errors: z.array(z.object({
    target: z.string(),
    error: z.string(),
  })).optional(),
});

/**
 * Scan status response for polling
 */
export const ScanStatusResponseSchema = z.object({
  status: ScanStatusSchema,
  progress: z.number().min(0).max(100).optional(),
});

/**
 * List scans query parameters
 */
export const ListScansQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  status: ScanStatusSchema.optional(),
});

/**
 * List scans response
 */
export const ListScansResponseSchema = z.object({
  data: z.array(ScanResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/**
 * Health check response
 */
export const HealthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  services: z.object({
    db: z.boolean(),
    redis: z.boolean(),
    worker: z.boolean(),
  }),
});

// Type exports
export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type ScanOptions = z.infer<typeof ScanOptionsSchema>;
export type CreateScanRequest = z.infer<typeof CreateScanRequestSchema>;
export type ScanSummary = z.infer<typeof ScanSummarySchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;
export type ScanResponse = z.infer<typeof ScanResponseSchema>;
export type CreateScanResponse = z.infer<typeof CreateScanResponseSchema>;
export type BulkCreateScanResponse = z.infer<typeof BulkCreateScanResponseSchema>;
export type ScanStatusResponse = z.infer<typeof ScanStatusResponseSchema>;
export type ListScansQuery = z.infer<typeof ListScansQuerySchema>;
export type ListScansResponse = z.infer<typeof ListScansResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
