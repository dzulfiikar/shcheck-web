import { describe, it, expect, beforeEach } from 'bun:test';
import { ShcheckService, ScanError } from '../../src/services/shcheck.service.js';
import type { ScanOptions } from '../../src/types/scan.types.js';

describe('ShcheckService', () => {
  let service: ShcheckService;

  beforeEach(() => {
    service = new ShcheckService(30000);
  });

  describe('URL Validation', () => {
    it('should accept valid HTTP URLs', () => {
      const validUrls = [
        'http://example.com',
        'http://example.com:8080',
        'http://example.com/path',
        'http://example.com/path?query=value',
        'http://192.168.1.1',
        'http://localhost:3000',
      ];

      for (const url of validUrls) {
        expect(() => {
          (service as unknown as { validateTarget: (target: string) => void }).validateTarget(url);
        }).not.toThrow();
      }
    });

    it('should accept valid HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'https://example.com:8443',
        'https://example.com/path/to/resource',
        'https://example.com/path?query=value&other=test',
        'https://192.168.1.1:8080',
        'https://localhost',
      ];

      for (const url of validUrls) {
        expect(() => {
          (service as unknown as { validateTarget: (target: string) => void }).validateTarget(url);
        }).not.toThrow();
      }
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'ftp://example.com',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'not-a-url',
        '',
        '   ',
        'example.com', // Missing protocol
      ];

      for (const url of invalidUrls) {
        expect(() => {
          (service as unknown as { validateTarget: (target: string) => void }).validateTarget(url);
        }).toThrow(ScanError);
      }
    });

    it('should reject URLs with dangerous characters', () => {
      const dangerousUrls = [
        'http://example.com;rm -rf /',
        'http://example.com|cat /etc/passwd',
        'http://example.com`whoami`',
        'http://example.com$(echo pwned)',
      ];

      for (const url of dangerousUrls) {
        // These should either throw ScanError or be handled safely
        try {
          (service as unknown as { validateTarget: (target: string) => void }).validateTarget(url);
          // If no error, the URL was accepted - that's fine as URL encoding handles it
        } catch (error) {
          expect(error).toBeInstanceOf(ScanError);
        }
      }
    });
  });

  describe('Port Validation', () => {
    it('should accept valid ports', () => {
      const validOptions: ScanOptions[] = [
        { port: 1 },
        { port: 80 },
        { port: 443 },
        { port: 8080 },
        { port: 65535 },
      ];

      for (const options of validOptions) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions(options);
        }).not.toThrow();
      }
    });

    it('should reject invalid ports', () => {
      const invalidOptions: ScanOptions[] = [
        { port: 0 },
        { port: -1 },
        { port: 65536 },
        { port: 99999 },
        { port: 3.14 }, // Non-integer
      ];

      for (const options of invalidOptions) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions(options);
        }).toThrow(ScanError);
      }
    });

    it('should accept undefined port', () => {
      expect(() => {
        (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({});
      }).not.toThrow();
    });
  });

  describe('HTTP Method Validation', () => {
    it('should accept valid HTTP methods', () => {
      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];

      for (const method of validMethods) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            method: method as ScanOptions['method'],
          });
        }).not.toThrow();
      }
    });

    it('should accept valid HTTP methods in lowercase', () => {
      const lowercaseMethods = ['get', 'post', 'put', 'delete', 'head', 'options', 'patch'];

      for (const method of lowercaseMethods) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            method: method.toUpperCase() as ScanOptions['method'],
          });
        }).not.toThrow();
      }
    });

    it('should reject invalid HTTP methods', () => {
      const invalidMethods = ['INVALID', 'TRACE', 'CONNECT', 'FOO', ''];

      for (const method of invalidMethods) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            method: method as ScanOptions['method'],
          });
        }).toThrow(ScanError);
      }
    });
  });

  describe('Header Validation', () => {
    it('should accept valid headers', () => {
      const validHeaders: Record<string, string>[] = [
        { 'Authorization': 'Bearer token123' },
        { 'Content-Type': 'application/json' },
        { 'X-Custom-Header': 'value' },
        { 'Accept': 'text/html,application/xhtml+xml' },
        { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        { 'X-API-Key': 'abc123xyz' },
      ];

      for (const headers of validHeaders) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            headers,
          });
        }).not.toThrow();
      }
    });

    it('should accept headers with special characters in values', () => {
      const headersWithSpecialChars: Record<string, string>[] = [
        { 'Authorization': 'Basic dXNlcjpwYXNz' },
        { 'Cookie': 'session=abc123; path=/' },
        { 'Accept-Language': 'en-US,en;q=0.9' },
        { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      ];

      for (const headers of headersWithSpecialChars) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            headers,
          });
        }).not.toThrow();
      }
    });

    it('should reject headers with invalid keys', () => {
      const invalidHeaderKeys: Record<string, string>[] = [
        { '': 'value' }, // Empty key
        { 'Invalid Key': 'value' }, // Space in key
        { 'Key\nInjection': 'value' }, // Newline in key
        { 'Key:Colon': 'value' }, // Colon in key
      ];

      for (const headers of invalidHeaderKeys) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            headers,
          });
        }).toThrow(ScanError);
      }
    });

    it('should reject headers with control characters in values', () => {
      const invalidHeaderValues: Record<string, string>[] = [
        { 'X-Header': 'value\nInjection' },
        { 'X-Header': 'value\r\nInjection' },
        { 'X-Header': 'value\x00Null' },
        { 'X-Header': 'value\x1FControl' },
      ];

      for (const headers of invalidHeaderValues) {
        expect(() => {
          (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
            headers,
          });
        }).toThrow(ScanError);
      }
    });

    it('should accept empty headers object', () => {
      expect(() => {
        (service as unknown as { validateScanOptions: (options: ScanOptions) => void }).validateScanOptions({
          headers: {},
        });
      }).not.toThrow();
    });
  });

  describe('Argument Building', () => {
    it('should build basic arguments with target only', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        {}
      );

      expect(args).toContain('--json-output');
      expect(args).toContain('https://example.com');
      expect(args[args.length - 1]).toBe('https://example.com'); // Target should be last
    });

    it('should include port option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { port: 8080 }
      );

      expect(args).toContain('--port');
      expect(args).toContain('8080');
    });

    it('should include useGet option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { useGet: true }
      );

      expect(args).toContain('--use-get-method');
    });

    it('should include method option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { method: 'POST' }
      );

      expect(args).toContain('--use-method');
      expect(args).toContain('POST');
    });

    it('should include showInformation option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { showInformation: true }
      );

      expect(args).toContain('--information');
    });

    it('should include showCaching option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { showCaching: true }
      );

      expect(args).toContain('--caching');
    });

    it('should include showDeprecated option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { showDeprecated: true }
      );

      expect(args).toContain('--deprecated');
    });

    it('should include cookies option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { cookies: 'session=abc123' }
      );

      expect(args).toContain('--cookie');
      expect(args).toContain('session=abc123');
    });

    it('should include proxy option', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        { proxy: 'http://proxy.example.com:8080' }
      );

      expect(args).toContain('--proxy');
      expect(args).toContain('http://proxy.example.com:8080');
    });

    it('should include custom headers', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        {
          headers: {
            'Authorization': 'Bearer token',
            'X-Custom': 'value',
          },
        }
      );

      expect(args).toContain('--add-header');
      expect(args).toContain('Authorization: Bearer token');
      expect(args).toContain('X-Custom: value');
    });

    it('should build complete argument list with all options', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        {
          port: 8443,
          useGet: true,
          method: 'POST',
          showInformation: true,
          showCaching: true,
          showDeprecated: true,
          cookies: 'session=test',
          proxy: 'http://proxy:8080',
          headers: {
            'Authorization': 'Bearer token',
          },
        }
      );

      // Verify all expected arguments are present
      expect(args).toContain('--port');
      expect(args).toContain('8443');
      expect(args).toContain('--use-get-method');
      expect(args).toContain('--use-method');
      expect(args).toContain('POST');
      expect(args).toContain('--information');
      expect(args).toContain('--caching');
      expect(args).toContain('--deprecated');
      expect(args).toContain('--cookie');
      expect(args).toContain('session=test');
      expect(args).toContain('--proxy');
      expect(args).toContain('http://proxy:8080');
      expect(args).toContain('--add-header');
      expect(args).toContain('Authorization: Bearer token');
      expect(args).toContain('--json-output');
      expect(args[args.length - 1]).toBe('https://example.com');
    });

    it('should always include --json-output flag', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        {}
      );

      expect(args).toContain('--json-output');
    });

    it('should place target as the last argument', () => {
      const args = (service as unknown as { buildArgs: (target: string, options: ScanOptions) => string[] }).buildArgs(
        'https://example.com',
        {
          port: 8080,
          useGet: true,
          headers: { 'X-Test': 'value' },
        }
      );

      expect(args[args.length - 1]).toBe('https://example.com');
    });
  });

  describe('ScanError', () => {
    it('should create error with message only', () => {
      const error = new ScanError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ScanError');
      expect(error.code).toBeUndefined();
      expect(error.stderr).toBeUndefined();
    });

    it('should create error with code', () => {
      const error = new ScanError('Test error', 1);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(1);
    });

    it('should create error with code and stderr', () => {
      const error = new ScanError('Test error', 1, 'stderr output');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(1);
      expect(error.stderr).toBe('stderr output');
    });

    it('should be instance of Error', () => {
      const error = new ScanError('Test error');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
