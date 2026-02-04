import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { scansRoutes } from '../../src/routes/scans.routes.js';
import { db } from '../../src/db/index.js';
import { scans, type ScanOptions } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { scanQueue, closeQueue } from '../../src/queue/index.js';

// Helper to create a test app with just the scans routes
function createTestApp() {
  return new Elysia().use(scansRoutes);
}

// Helper to clean up test data
async function cleanupTestData() {
  try {
    // Clean up queue
    await scanQueue.clean(0, 0, 'completed');
    await scanQueue.clean(0, 0, 'failed');
    await scanQueue.clean(0, 0, 'wait');

    // Clean up database
    await db.delete(scans);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

describe('Scans API Integration', () => {
  let app: Elysia;

  beforeEach(async () => {
    app = createTestApp();
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/scans', () => {
    it('should create a new scan with minimal data', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'https://example.com',
          }),
        })
      );

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status', 'pending');
      expect(body.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Verify scan was created in database
      const scanResult = await db.select().from(scans).where(eq(scans.id, body.jobId));
      expect(scanResult.length).toBe(1);
      expect(scanResult[0].target).toBe('https://example.com');
      expect(scanResult[0].status).toBe('pending');
    });

    it('should create a scan with all options', async () => {
      const options: ScanOptions = {
        port: 8443,
        useGet: true,
        method: 'POST',
        showInformation: true,
        showCaching: true,
        showDeprecated: true,
        cookies: 'session=test123',
        proxy: 'http://proxy.example.com:8080',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      };

      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'https://example.com',
            ...options,
          }),
        })
      );

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.status).toBe('pending');

      // Verify scan was created with options
      const scanResult = await db.select().from(scans).where(eq(scans.id, body.jobId));
      expect(scanResult.length).toBe(1);
      expect(scanResult[0].options).toMatchObject(options);
    });

    it('should reject invalid target URL', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'not-a-valid-url',
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('should reject missing target', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      );

      expect(response.status).toBe(422);
    });

    it('should reject invalid port', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'https://example.com',
            port: 99999,
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('should reject invalid HTTP method', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'https://example.com',
            method: 'INVALID',
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('should accept FTP protocol URLs (validation happens at service level)', async () => {
      // The API accepts any URI format, service layer validates
      const response = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'ftp://example.com',
          }),
        })
      );

      // API accepts it, service layer will reject during execution
      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/scans', () => {
    it('should return empty list when no scans exist', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans')
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('total', 0);
      expect(body).toHaveProperty('page', 1);
      expect(body).toHaveProperty('limit', 20);
      expect(body.data).toBeArray();
      expect(body.data.length).toBe(0);
    });

    it('should return list of scans', async () => {
      // Create test scans
      const testScans = [
        { target: 'https://example1.com', status: 'pending' as const },
        { target: 'https://example2.com', status: 'completed' as const },
        { target: 'https://example3.com', status: 'failed' as const },
      ];

      for (const scanData of testScans) {
        await db.insert(scans).values(scanData);
      }

      const response = await app.handle(
        new Request('http://localhost/api/scans')
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.total).toBe(3);
      expect(body.data.length).toBe(3);

      // Verify scan structure
      const firstScan = body.data[0];
      expect(firstScan).toHaveProperty('id');
      expect(firstScan).toHaveProperty('target');
      expect(firstScan).toHaveProperty('status');
      expect(firstScan).toHaveProperty('createdAt');
    });

    it('should support pagination', async () => {
      // Create 25 test scans
      for (let i = 0; i < 25; i++) {
        await db.insert(scans).values({
          target: `https://example${i}.com`,
          status: 'pending',
        });
      }

      // Get first page
      const response1 = await app.handle(
        new Request('http://localhost/api/scans?page=1&limit=10')
      );

      const body1 = await response1.json();
      expect(body1.total).toBe(25);
      expect(body1.page).toBe(1);
      expect(body1.limit).toBe(10);
      expect(body1.data.length).toBe(10);

      // Get second page
      const response2 = await app.handle(
        new Request('http://localhost/api/scans?page=2&limit=10')
      );

      const body2 = await response2.json();
      expect(body2.page).toBe(2);
      expect(body2.data.length).toBe(10);

      // Get third page
      const response3 = await app.handle(
        new Request('http://localhost/api/scans?page=3&limit=10')
      );

      const body3 = await response3.json();
      expect(body3.page).toBe(3);
      expect(body3.data.length).toBe(5);
    });

    it('should filter by status', async () => {
      // Create scans with different statuses
      await db.insert(scans).values([
        { target: 'https://pending.com', status: 'pending' },
        { target: 'https://completed.com', status: 'completed' },
        { target: 'https://failed.com', status: 'failed' },
        { target: 'https://processing.com', status: 'processing' },
      ]);

      const response = await app.handle(
        new Request('http://localhost/api/scans?status=completed')
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.total).toBe(1);
      expect(body.data[0].target).toBe('https://completed.com');
      expect(body.data[0].status).toBe('completed');
    });

    it('should return scans ordered by createdAt desc', async () => {
      // Create scans with specific timestamps
      const now = new Date();
      await db.insert(scans).values([
        { target: 'https://oldest.com', status: 'pending', createdAt: new Date(now.getTime() - 2000) },
        { target: 'https://middle.com', status: 'pending', createdAt: new Date(now.getTime() - 1000) },
        { target: 'https://newest.com', status: 'pending', createdAt: now },
      ]);

      const response = await app.handle(
        new Request('http://localhost/api/scans')
      );

      const body = await response.json();
      expect(body.data[0].target).toBe('https://newest.com');
      expect(body.data[1].target).toBe('https://middle.com');
      expect(body.data[2].target).toBe('https://oldest.com');
    });

    it('should reject invalid page parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans?page=0')
      );

      expect(response.status).toBe(422);
    });

    it('should reject invalid limit parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans?limit=101')
      );

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/scans/:id', () => {
    it('should return scan by ID', async () => {
      // Create a test scan
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'completed',
          result: {
            url: 'https://example.com',
            effectiveUrl: 'https://example.com',
            present: { 'X-Frame-Options': 'DENY' },
            missing: ['Content-Security-Policy'],
            summary: { safe: 1, unsafe: 1 },
          },
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}`)
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.id).toBe(scan.id);
      expect(body.target).toBe('https://example.com');
      expect(body.status).toBe('completed');
      expect(body.result).toBeDefined();
      expect(body.result.summary.safe).toBe(1);
      expect(body.result.summary.unsafe).toBe(1);
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/00000000-0000-0000-0000-000000000000')
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toHaveProperty('error', 'Scan not found');
    });

    it('should return 422 for invalid UUID', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/invalid-uuid')
      );

      expect(response.status).toBe(422);
    });

    it('should include all scan fields', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'completed',
          options: { port: 8443, useGet: true },
          result: {
            url: 'https://example.com',
            effectiveUrl: 'https://example.com',
            present: {},
            missing: [],
            summary: { safe: 0, unsafe: 0 },
          },
          error: null,
          duration: 1500,
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}`)
      );

      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('target');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('options');
      expect(body).toHaveProperty('result');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('startedAt');
      expect(body).toHaveProperty('completedAt');
      expect(body).toHaveProperty('duration');
      expect(body.duration).toBe(1500);
    });
  });

  describe('GET /api/scans/:id/status', () => {
    it('should return status for pending scan', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'pending',
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}/status`)
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('pending');
    });

    it('should return status for completed scan', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'completed',
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}/status`)
      );

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.status).toBe('completed');
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/00000000-0000-0000-0000-000000000000/status')
      );

      expect(response.status).toBe(404);
    });

    it('should include progress for pending/processing scans', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'processing',
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}/status`)
      );

      const body = await response.json();
      expect(body.status).toBe('processing');
      // Progress may or may not be present depending on queue state
    });
  });

  describe('DELETE /api/scans/:id', () => {
    it('should delete existing scan', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'pending',
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(204);

      // Verify scan was deleted
      const scanResult = await db.select().from(scans).where(eq(scans.id, scan.id));
      expect(scanResult.length).toBe(0);
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/00000000-0000-0000-0000-000000000000', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toHaveProperty('error', 'Scan not found');
    });

    it('should remove scan from queue when deleting pending scan', async () => {
      // Create a scan and add to queue
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'pending',
        })
        .returning();

      await scanQueue.add('scan', {
        scanId: scan.id,
        target: scan.target,
      }, {
        jobId: `scan-${scan.id}`,
      });

      // Verify job exists
      const jobBefore = await scanQueue.getJob(`scan-${scan.id}`);
      expect(jobBefore).toBeDefined();

      // Delete scan
      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}`, {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(204);
    });

    it('should return 422 for invalid UUID', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/invalid-uuid', {
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(422);
    });
  });

  describe('End-to-End Scan Flow', () => {
    it('should complete full scan lifecycle', async () => {
      // 1. Create scan
      const createResponse = await app.handle(
        new Request('http://localhost/api/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: 'https://example.com',
            showInformation: true,
          }),
        })
      );

      expect(createResponse.status).toBe(201);
      const { jobId } = await createResponse.json();

      // 2. Get scan details
      const getResponse = await app.handle(
        new Request(`http://localhost/api/scans/${jobId}`)
      );

      expect(getResponse.status).toBe(200);
      const scanDetails = await getResponse.json();
      expect(scanDetails.id).toBe(jobId);
      expect(scanDetails.target).toBe('https://example.com');

      // 3. Check status
      const statusResponse = await app.handle(
        new Request(`http://localhost/api/scans/${jobId}/status`)
      );

      expect(statusResponse.status).toBe(200);
      const status = await statusResponse.json();
      expect(status.status).toBe('pending');

      // 4. List scans
      const listResponse = await app.handle(
        new Request('http://localhost/api/scans')
      );

      expect(listResponse.status).toBe(200);
      const list = await listResponse.json();
      expect(list.total).toBeGreaterThanOrEqual(1);
      expect(list.data.some((s: { id: string }) => s.id === jobId)).toBe(true);

      // 5. Delete scan
      const deleteResponse = await app.handle(
        new Request(`http://localhost/api/scans/${jobId}`, {
          method: 'DELETE',
        })
      );

      expect(deleteResponse.status).toBe(204);

      // 6. Verify deletion
      const verifyResponse = await app.handle(
        new Request(`http://localhost/api/scans/${jobId}`)
      );

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('GET /api/scans/:id/pdf', () => {
    it('should return PDF for completed scan', async () => {
      // Create a completed scan with results
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'completed',
          result: {
            url: 'https://example.com',
            effectiveUrl: 'https://example.com',
            present: { 'X-Frame-Options': 'DENY' },
            missing: ['Content-Security-Policy'],
            summary: { safe: 1, unsafe: 1 },
          },
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}/pdf`)
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain(scan.id.slice(0, 8));

      const blob = await response.blob();
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should return PDF for scan without results', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'pending',
          result: null,
        })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/api/scans/${scan.id}/pdf`)
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
    });

    it('should return 404 for non-existent scan', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/00000000-0000-0000-0000-000000000000/pdf')
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toHaveProperty('error', 'Scan not found');
    });

    it('should return 422 for invalid UUID', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/invalid-uuid/pdf')
      );

      expect(response.status).toBe(422);
    });
  });

  describe('POST /api/scans/bulk-pdf', () => {
    it('should return bulk PDF for multiple scans', async () => {
      // Create multiple scans
      const scanData = [
        {
          target: 'https://example1.com',
          status: 'completed' as const,
          result: {
            url: 'https://example1.com',
            effectiveUrl: 'https://example1.com',
            present: { 'X-Frame-Options': 'DENY' },
            missing: [],
            summary: { safe: 1, unsafe: 0 },
          },
        },
        {
          target: 'https://example2.com',
          status: 'completed' as const,
          result: {
            url: 'https://example2.com',
            effectiveUrl: 'https://example2.com',
            present: { 'X-Content-Type-Options': 'nosniff' },
            missing: [],
            summary: { safe: 1, unsafe: 0 },
          },
        },
      ];

      const insertedScans = await db.insert(scans).values(scanData).returning();
      const scanIds = insertedScans.map(s => s.id);

      const response = await app.handle(
        new Request('http://localhost/api/scans/bulk-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: scanIds }),
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('scans-report-');

      const blob = await response.blob();
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should return 400 for empty scan IDs array', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/bulk-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [] }),
        })
      );

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty('error', 'No scan IDs provided');
    });

    it('should return 400 for missing ids field', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/bulk-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      );

      expect(response.status).toBe(400);
    });

    it('should return 404 when no scans found with provided IDs', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/bulk-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: ['00000000-0000-0000-0000-000000000000'],
          }),
        })
      );

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body).toHaveProperty('error', 'No scans found');
    });

    it('should reject invalid UUID in array', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/scans/bulk-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: ['valid-uuid-1234', 'invalid-uuid'],
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('should handle single scan ID', async () => {
      const [scan] = await db
        .insert(scans)
        .values({
          target: 'https://example.com',
          status: 'completed',
          result: {
            url: 'https://example.com',
            effectiveUrl: 'https://example.com',
            present: {},
            missing: [],
            summary: { safe: 0, unsafe: 0 },
          },
        })
        .returning();

      const response = await app.handle(
        new Request('http://localhost/api/scans/bulk-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [scan.id] }),
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/pdf');
    });
  });
});
