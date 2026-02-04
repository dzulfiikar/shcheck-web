import { describe, it, expect } from 'bun:test';

describe('Utility Functions', () => {
  describe('UUID Validation', () => {
    it('should validate correct UUID format', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '12345678-1234-1234-1234-123456789abc',
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const uuid of validUuids) {
        expect(uuidRegex.test(uuid)).toBe(true);
      }
    });

    it('should reject invalid UUID format', () => {
      const invalidUuids = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-44665544000g', // Invalid character 'g'
        '550e8400e29b41d4a716446655440000', // Missing dashes
        '',
        '   ',
      ];

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const uuid of invalidUuids) {
        expect(uuidRegex.test(uuid)).toBe(false);
      }
    });
  });

  describe('URL Validation', () => {
    it('should validate HTTP URLs', () => {
      const validUrls = [
        'http://example.com',
        'http://example.com:8080',
        'http://example.com/path/to/resource',
        'http://example.com?query=value',
        'http://192.168.1.1',
        'http://localhost:3000',
      ];

      for (const url of validUrls) {
        expect(() => new URL(url)).not.toThrow();
      }
    });

    it('should validate HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'https://example.com:8443',
        'https://user:pass@example.com',
        'https://example.com/path?query=value#fragment',
      ];

      for (const url of validUrls) {
        expect(() => new URL(url)).not.toThrow();
      }
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        '',
        '   ',
        'example.com', // Missing protocol
        '://missing-protocol.com',
      ];

      for (const url of invalidUrls) {
        expect(() => new URL(url)).toThrow();
      }
    });
  });

  describe('Port Validation', () => {
    it('should validate valid port numbers', () => {
      const validPorts = [1, 80, 443, 8080, 65535];

      for (const port of validPorts) {
        expect(port).toBeGreaterThanOrEqual(1);
        expect(port).toBeLessThanOrEqual(65535);
        expect(Number.isInteger(port)).toBe(true);
      }
    });

    it('should identify invalid port numbers', () => {
      const invalidPorts = [0, -1, 65536, 99999, 3.14];

      for (const port of invalidPorts) {
        const isValid =
          Number.isInteger(port) && port >= 1 && port <= 65535;
        expect(isValid).toBe(false);
      }
    });
  });

  describe('HTTP Method Validation', () => {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];

    it('should validate standard HTTP methods', () => {
      for (const method of validMethods) {
        expect(validMethods.includes(method.toUpperCase())).toBe(true);
      }
    });

    it('should reject invalid HTTP methods', () => {
      const invalidMethods = ['INVALID', 'TRACE', 'CONNECT', 'FOO', 'BAR'];

      for (const method of invalidMethods) {
        expect(validMethods.includes(method.toUpperCase())).toBe(false);
      }
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize scan results', () => {
      const scanResult = {
        url: 'https://example.com',
        effectiveUrl: 'https://example.com',
        present: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
        },
        missing: ['Content-Security-Policy'],
        summary: {
          safe: 2,
          unsafe: 1,
        },
      };

      const serialized = JSON.stringify(scanResult);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(scanResult);
    });

    it('should handle empty objects and arrays', () => {
      const emptyResult = {
        url: 'https://example.com',
        effectiveUrl: 'https://example.com',
        present: {},
        missing: [],
        summary: {
          safe: 0,
          unsafe: 0,
        },
      };

      const serialized = JSON.stringify(emptyResult);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(emptyResult);
    });

    it('should handle special characters in strings', () => {
      const data = {
        message: 'Special chars: \n\r\t"\\',
        unicode: 'Unicode: \u00e9\u00e8\u00ea',
      };

      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(data);
    });
  });

  describe('Date Handling', () => {
    it('should create valid ISO date strings', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const isoString = date.toISOString();

      expect(isoString).toBe('2024-01-15T10:30:00.000Z');
      expect(new Date(isoString).getTime()).toBe(date.getTime());
    });

    it('should parse ISO date strings', () => {
      const isoString = '2024-01-15T10:30:00.000Z';
      const date = new Date(isoString);

      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(0); // January is 0
      expect(date.getUTCDate()).toBe(15);
      expect(date.getUTCHours()).toBe(10);
      expect(date.getUTCMinutes()).toBe(30);
    });
  });

  describe('Base64 Encoding', () => {
    it('should encode and decode strings', () => {
      const original = 'Hello, World! 123';
      const encoded = Buffer.from(original).toString('base64');
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');

      expect(decoded).toBe(original);
    });

    it('should handle authorization header format', () => {
      const credentials = 'user:password';
      const encoded = Buffer.from(credentials).toString('base64');
      const authHeader = `Basic ${encoded}`;

      expect(authHeader).toBe('Basic dXNlcjpwYXNzd29yZA==');

      // Decode
      const parts = authHeader.split(' ');
      expect(parts[0]).toBe('Basic');
      const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
      expect(decoded).toBe(credentials);
    });
  });
});
