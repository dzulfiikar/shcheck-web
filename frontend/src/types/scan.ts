/**
 * Scan types for the frontend
 * Mirrors the types from the backend for consistency
 */

/**
 * HTTP methods supported by shcheck
 */
export type HttpMethod = 'HEAD' | 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Scan status values
 */
export type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Scan options for creating a new scan
 */
export interface ScanOptions {
  port?: number;
  useGet?: boolean;
  method?: HttpMethod;
  showInformation?: boolean;
  showCaching?: boolean;
  showDeprecated?: boolean;
  cookies?: string;
  headers?: Record<string, string>;
  proxy?: string;
}

/**
 * Scan summary from results
 */
export interface ScanSummary {
  safe: number;
  unsafe: number;
}

/**
 * CSP Severity levels
 */
export type CSPSeverity = 'high' | 'medium' | 'low' | 'info';

/**
 * CSP Finding
 */
export interface CSPFinding {
  type: 'error' | 'warning' | 'info' | 'success';
  severity: CSPSeverity;
  message: string;
  directive?: string;
  recommendation?: string;
}

/**
 * CSP Directive Evaluation
 */
export interface CSPDirectiveEvaluation {
  name: string;
  value: string;
  sources: string[];
  isSecure: boolean;
  warnings: string[];
  category: 'fetch' | 'document' | 'navigation' | 'reporting' | 'other';
}

/**
 * CSP Policy Evaluation
 */
export interface CSPPolicyEvaluation {
  policy: string;
  directives: CSPDirectiveEvaluation[];
  findings: CSPFinding[];
  score: number;
  effectiveness: 'weak' | 'moderate' | 'strong';
  missingDirectives: string[];
  unsafeSources: string[];
  bypasses: string[];
}

/**
 * CSP Report Only Evaluation
 */
export interface CSPReportOnlyEvaluation {
  reportOnly: boolean;
  reportUri?: string;
  reportTo?: string;
}

/**
 * CSP Framework Detection
 */
export interface CSPFrameworkDetection {
  framework: string;
  detected: boolean;
  requiredDirectives: string[];
}

/**
 * CSP Evaluation Result
 */
export interface CSPEvaluation {
  headers: {
    'content-security-policy'?: CSPPolicyEvaluation;
    'content-security-policy-report-only'?: CSPReportOnlyEvaluation;
  };
  overallScore: number;
  overallEffectiveness: 'none' | 'weak' | 'moderate' | 'strong';
  recommendations: string[];
  bypassTechniques: string[];
  frameworkCompatibility: CSPFrameworkDetection[];
}

/**
 * Scan result structure
 * Matches the shcheck JSON output
 */
export interface ScanResult {
  url: string;
  effectiveUrl: string;
  present: Record<string, string>;
  missing: string[];
  informationDisclosure?: Record<string, string>;
  caching?: Record<string, string>;
  summary: ScanSummary;
  cspEvaluation?: CSPEvaluation;
}

/**
 * Scan response from the API
 */
export interface ScanResponse {
  id: string;
  target: string;
  status: ScanStatus;
  options?: ScanOptions | null;
  result?: ScanResult | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: number | null;
}

/**
 * Create scan request body
 */
export interface CreateScanRequest {
  target: string;
  port?: number;
  useGet?: boolean;
  method?: HttpMethod;
  showInformation?: boolean;
  showCaching?: boolean;
  showDeprecated?: boolean;
  cookies?: string;
  headers?: Record<string, string>;
  proxy?: string;
}

/**
 * Create scan response
 */
export interface CreateScanResponse {
  jobId: string;
  status: 'pending';
}

/**
 * Bulk create scan request
 */
export interface BulkCreateScanRequest {
  targets: string;
  port?: number;
  useGet?: boolean;
  method?: HttpMethod;
  showInformation?: boolean;
  showCaching?: boolean;
  showDeprecated?: boolean;
  cookies?: string;
  headers?: Record<string, string>;
  proxy?: string;
}

/**
 * Bulk create scan response
 */
export interface BulkCreateScanResponse {
  jobs: CreateScanResponse[];
  total: number;
  created: number;
  errors?: Array<{
    target: string;
    error: string;
  }>;
}

/**
 * Scan status response for polling
 */
export interface ScanStatusResponse {
  status: ScanStatus;
  progress?: number;
}

/**
 * List scans query parameters
 */
export interface ListScansQuery {
  page?: number;
  limit?: number;
  status?: ScanStatus;
  search?: string;
}

/**
 * Bulk delete request
 */
export interface BulkDeleteRequest {
  ids: string[];
}

/**
 * Bulk delete response
 */
export interface BulkDeleteResponse {
  deleted: number;
  ids: string[];
}

/**
 * List scans response
 */
export interface ListScansResponse {
  data: ScanResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok';
  timestamp: string;
  services: {
    db: boolean;
    redis: boolean;
    worker: boolean;
  };
}
