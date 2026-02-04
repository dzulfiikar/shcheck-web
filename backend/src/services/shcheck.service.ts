import { spawn } from 'child_process';
import { ScanOptions, ScanResult } from '../db/schema.js';
import { cspEvaluator } from './csp-evaluator.service.js';

/**
 * Error thrown when a scan fails
 */
export class ScanError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

/**
 * Service for executing shcheck Python script
 * Handles command-line argument building, execution, and result parsing
 */
export class ShcheckService {
  private readonly scriptPath: string;
  private readonly timeout: number;
  private readonly maxBufferSize: number;
  private readonly validHttpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];

  // Allowed characters for header keys and values (RFC 7230 compliant subset)
  private readonly validHeaderKeyRegex = /^[a-zA-Z0-9!#$%&'*+\-.^_`|~]+$/;
  private readonly validHeaderValueRegex = /^[\x20-\x7E\t]*$/;

  constructor(timeoutMs: number = 60000) {
    this.timeout = timeoutMs;
    this.scriptPath = process.env.SHCHECK_SCRIPT_PATH || '/app/shcheck/shcheck.py';
    this.maxBufferSize = parseInt(process.env.SHCHECK_MAX_BUFFER_SIZE || '10485760', 10); // 10MB default
  }

  /**
   * Execute a security header scan against a target
   * @param target - The URL or IP to scan
   * @param options - Scan configuration options
   * @returns Promise resolving to ScanResult
   * @throws ScanError if the scan fails
   */
  async executeScan(target: string, options: ScanOptions = {}): Promise<ScanResult> {
    // Validate target URL
    this.validateTarget(target);

    // Validate scan options
    this.validateScanOptions(options);

    const args = this.buildArgs(target, options);

    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.scriptPath, ...args]);

      let stdout = '';
      let stderr = '';
      let rejected = false;

      const timeoutId = setTimeout(() => {
        rejected = true;
        python.kill('SIGTERM');
        // Give it 5 seconds to gracefully terminate, then force kill
        setTimeout(() => {
          if (!python.killed) {
            python.kill('SIGKILL');
          }
        }, 5000);
        reject(new ScanError(`Scan timeout after ${this.timeout}ms`, -1));
      }, this.timeout);

      python.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        // Check buffer size limit
        if (Buffer.byteLength(stdout, 'utf8') > this.maxBufferSize) {
          rejected = true;
          python.kill('SIGKILL');
          clearTimeout(timeoutId);
          reject(new ScanError(`Scan output exceeded maximum buffer size of ${this.maxBufferSize} bytes`));
        }
      });

      python.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      python.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        reject(new ScanError(`Failed to start scan: ${error.message}`));
      });

      python.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (rejected) {
          // Already rejected by timeout or buffer limit handler
          return;
        }

        if (code !== 0) {
          const errorMessage = stderr.trim() || `Process exited with code ${code}`;
          reject(new ScanError(errorMessage, code ?? undefined, stderr));
          return;
        }

        try {
          const result = this.parseOutput(stdout, target);
          resolve(result);
        } catch (e) {
          const parseError = e instanceof Error ? e.message : 'Unknown parse error';
          reject(new ScanError(`Failed to parse scan output: ${parseError}`, code ?? undefined, stdout));
        }
      });
    });
  }

  /**
   * Build command-line arguments from ScanOptions
   * Maps TypeScript property names to CLI flags
   */
  private buildArgs(target: string, options: ScanOptions): string[] {
    const args: string[] = [];

    if (options.port) {
      args.push('--port', options.port.toString());
    }

    if (options.useGet) {
      args.push('--use-get-method');
    }

    if (options.method) {
      args.push('--use-method', options.method);
    }

    if (options.showInformation) {
      args.push('--information');
    }

    if (options.showCaching) {
      args.push('--caching');
    }

    if (options.showDeprecated) {
      args.push('--deprecated');
    }

    if (options.cookies) {
      args.push('--cookie', options.cookies);
    }

    if (options.proxy) {
      args.push('--proxy', options.proxy);
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push('--add-header', `${key}: ${value}`);
      }
    }

    // Always enable JSON output for parsing
    args.push('--json-output');

    // Target must be last
    args.push(target);

    return args;
  }

  /**
   * Validate target URL to prevent command injection
   * @param target - The URL to validate
   * @throws ScanError if the target is invalid
   */
  private validateTarget(target: string): void {
    try {
      const url = new URL(target);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new ScanError(`Invalid target URL: ${target}`);
    }
  }

  /**
   * Validate scan options
   * @param options - The scan options to validate
   * @throws ScanError if any option is invalid
   */
  private validateScanOptions(options: ScanOptions): void {
    // Validate port
    if (options.port !== undefined) {
      const portNum = Number(options.port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        throw new ScanError(`Invalid port: ${options.port}. Must be an integer between 1 and 65535.`);
      }
    }

    // Validate HTTP method
    if (options.method !== undefined) {
      if (!this.validHttpMethods.includes(options.method.toUpperCase())) {
        throw new ScanError(`Invalid HTTP method: ${options.method}. Must be one of: ${this.validHttpMethods.join(', ')}`);
      }
    }

    // Validate headers
    if (options.headers !== undefined) {
      this.validateHeaders(options.headers);
    }
  }

  /**
   * Validate header keys and values
   * @param headers - The headers object to validate
   * @throws ScanError if any header is invalid
   */
  private validateHeaders(headers: Record<string, string>): void {
    for (const [key, value] of Object.entries(headers)) {
      // Validate header key
      if (!this.validHeaderKeyRegex.test(key)) {
        throw new ScanError(`Invalid header key: "${key}". Contains invalid characters.`);
      }

      // Validate header value
      if (!this.validHeaderValueRegex.test(value)) {
        throw new ScanError(`Invalid header value for "${key}". Contains invalid characters.`);
      }
    }
  }

  /**
   * Parse the JSON output from shcheck into ScanResult format
   * Transforms shcheck's URL-keyed output into our schema format
   */
  private parseOutput(output: string, originalTarget: string): ScanResult {
    let jsonData: Record<string, unknown>;

    try {
      jsonData = JSON.parse(output);
    } catch (e) {
      throw new Error(`Invalid JSON output: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // Find the URL key (shcheck uses the effective URL as the key)
    const urlKeys = Object.keys(jsonData).filter(key =>
      key.startsWith('http://') || key.startsWith('https://')
    );

    if (urlKeys.length === 0) {
      throw new Error('No URL results found in scan output');
    }

    // Use the first URL result (shcheck typically returns one target at a time)
    const effectiveUrl = urlKeys[0];
    const urlData = jsonData[effectiveUrl] as {
      present?: Record<string, string>;
      missing?: string[];
    };

    // Extract information disclosure headers if present
    const informationDisclosure = (jsonData as Record<string, Record<string, string>>).information_disclosure;

    // Extract caching headers if present
    const caching = (jsonData as Record<string, Record<string, string>>).caching;

    // Calculate summary
    const present = urlData.present || {};
    const missing = urlData.missing || [];
    const safe = Object.keys(present).length;
    const unsafe = missing.length;

    // Build result object
    const result: ScanResult = {
      url: originalTarget,
      effectiveUrl,
      present,
      missing,
      informationDisclosure,
      caching,
      summary: {
        safe,
        unsafe,
      },
    };

    // Evaluate CSP if present (case-insensitive header lookup)
    const presentKeys = Object.keys(present);
    const hasCSP = presentKeys.some(k => k.toLowerCase() === 'content-security-policy');
    const hasCSPReportOnly = presentKeys.some(k => k.toLowerCase() === 'content-security-policy-report-only');
    if (hasCSP || hasCSPReportOnly) {
      result.cspEvaluation = cspEvaluator.evaluate(present);
    }

    return result;
  }
}

// Export singleton instance with default timeout
export const shcheckService = new ShcheckService();
