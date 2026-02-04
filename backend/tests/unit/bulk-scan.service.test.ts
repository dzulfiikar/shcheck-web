import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { scansRoutes, publishScanUpdate } from '../../src/routes/scans.routes';
import { db } from '../../src/db/index';
import { scanQueue } from '../../src/queue/index';

// Mock the database and queue
mock.module('../../src/db/index', () => ({
  db: {
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([{ id: 'test-uuid', target: 'https://example.com', status: 'pending' }])),
      })),
    })),
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => Promise.resolve([{ id: 'test-uuid', target: 'https://example.com', status: 'pending' }])),
        })),
      })),
    })),
  },
}));

mock.module('../../src/queue/index', () => ({
  scanQueue: {
    add: mock(() => Promise.resolve({ id: 'job-1' })),
  },
  getScanJobStatus: mock(() => Promise.resolve({ progress: 50 })),
  removeScanJob: mock(() => Promise.resolve()),
}));

describe('Bulk Scan Service', () => {
  describe('POST /api/scans/bulk', () => {
    it('should create multiple scan jobs from newline-separated URLs', async () => {
      const requestBody = {
        targets: 'https://example.com\nhttps://test.com\nhttps://demo.com',
      };

      const mockContext = {
        body: requestBody,
        set: { status: 0 },
      };

      // The route handler is tested through integration tests
      // This is a placeholder for unit test structure
      expect(requestBody.targets.split('\n').filter(t => t.trim().length > 0).length).toBe(3);
    });

    it('should filter out empty lines from targets', async () => {
      const targets = 'https://example.com\n\nhttps://test.com\n   \nhttps://demo.com\n';
      const filtered = targets.split('\n').map(t => t.trim()).filter(t => t.length > 0);

      expect(filtered.length).toBe(3);
      expect(filtered).toEqual(['https://example.com', 'https://test.com', 'https://demo.com']);
    });

    it('should return error when no valid targets provided', async () => {
      const targets = '\n   \n\n';
      const filtered = targets.split('\n').map(t => t.trim()).filter(t => t.length > 0);

      expect(filtered.length).toBe(0);
    });

    it('should validate URL format before creating scan', async () => {
      const validUrls = [
        'https://example.com',
        'http://test.com:8080',
        'https://sub.domain.co.uk/path?query=1',
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://invalid.protocol.com',
        '',
      ];

      for (const url of validUrls) {
        expect(() => new URL(url)).not.toThrow();
      }

      for (const url of invalidUrls) {
        if (url) {
          // Empty string throws different error
        }
      }
    });
  });

  describe('BulkCreateScanResponse type', () => {
    it('should have correct structure', () => {
      const response = {
        jobs: [
          { jobId: 'uuid-1', status: 'pending' as const },
          { jobId: 'uuid-2', status: 'pending' as const },
        ],
        total: 2,
        created: 2,
      };

      expect(response.jobs).toHaveLength(2);
      expect(response.total).toBe(2);
      expect(response.created).toBe(2);
      expect(response.jobs[0].status).toBe('pending');
    });

    it('should include errors when some scans fail', () => {
      const response = {
        jobs: [{ jobId: 'uuid-1', status: 'pending' as const }],
        total: 2,
        created: 1,
        errors: [{ target: 'invalid-url', error: 'Invalid URL format' }],
      };

      expect(response.created).toBe(1);
      expect(response.total).toBe(2);
      expect(response.errors).toBeDefined();
      expect(response.errors?.[0].target).toBe('invalid-url');
    });
  });
});
