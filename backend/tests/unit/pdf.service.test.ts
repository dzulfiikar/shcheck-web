import { describe, it, expect, beforeEach } from 'bun:test';
import { PDFService } from '../../src/services/pdf.service.js';
import type { ScanResponse } from '../../src/types/scan.types.js';
import type { ScanResult, CSPEvaluation } from '../../src/db/schema.js';

describe('PDFService', () => {
  let pdfService: PDFService;

  beforeEach(() => {
    pdfService = new PDFService();
  });

  describe('generateScanReport', () => {
    it('should generate a PDF for a completed scan with results', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        startedAt: '2024-01-15T10:30:05Z',
        completedAt: '2024-01-15T10:30:10Z',
        duration: 5000,
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Strict-Transport-Security': 'max-age=31536000',
          },
          missing: ['Content-Security-Policy', 'X-XSS-Protection'],
          summary: { safe: 3, unsafe: 2 },
        },
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF magic number
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('should generate a PDF for a scan with CSP evaluation', async () => {
      const mockCspEvaluation: CSPEvaluation = {
        headers: {
          'content-security-policy': {
            score: 75,
            effectiveness: 'moderate',
            policy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
            directives: [
              { name: 'default-src', value: "'self'", category: 'fetch', isSecure: true, warnings: [] },
              { name: 'script-src', value: "'self' 'unsafe-inline'", category: 'script', isSecure: false, warnings: ['unsafe-inline allows XSS'] },
            ],
            findings: [
              { type: 'warning', message: 'unsafe-inline is dangerous', severity: 'high', directive: 'script-src' },
            ],
            unsafeSources: ["'unsafe-inline'"],
            missingDirectives: ['frame-ancestors'],
            bypasses: [],
          },
        },
        overallScore: 75,
        overallEffectiveness: 'moderate',
        recommendations: ['Remove unsafe-inline', 'Add frame-ancestors directive'],
        bypassTechniques: [],
        frameworkCompatibility: [{ framework: 'React', detected: true }],
      };

      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: {
            'Content-Security-Policy': "default-src 'self'",
          },
          missing: [],
          summary: { safe: 1, unsafe: 0 },
          cspEvaluation: mockCspEvaluation,
        },
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate a PDF for a scan with information disclosure headers', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: { 'X-Frame-Options': 'DENY' },
          missing: [],
          informationDisclosure: {
            'Server': 'Apache/2.4.41',
            'X-Powered-By': 'PHP/7.4.3',
          },
          summary: { safe: 1, unsafe: 0 },
        },
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate a PDF for a scan with caching headers', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: { 'X-Frame-Options': 'DENY' },
          missing: [],
          caching: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Expires': '0',
          },
          summary: { safe: 1, unsafe: 0 },
        },
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate a PDF for a pending scan with no results', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'pending',
        createdAt: '2024-01-15T10:30:00Z',
        result: null,
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate a PDF for a failed scan', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'failed',
        createdAt: '2024-01-15T10:30:00Z',
        error: 'Connection timeout',
        result: null,
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate a PDF for a scan with all headers present', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Strict-Transport-Security': 'max-age=31536000',
            'Content-Security-Policy': "default-src 'self'",
          },
          missing: [],
          summary: { safe: 4, unsafe: 0 },
        },
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should generate a PDF for a scan with no headers present', async () => {
      const mockScan: ScanResponse = {
        id: '12345678-1234-1234-1234-123456789abc',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: {},
          missing: ['X-Frame-Options', 'X-Content-Type-Options', 'Strict-Transport-Security'],
          summary: { safe: 0, unsafe: 3 },
        },
      };

      const pdfBuffer = await pdfService.generateScanReport(mockScan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateBulkReport', () => {
    it('should generate a bulk PDF for multiple scans', async () => {
      const mockScans: ScanResponse[] = [
        {
          id: '12345678-1234-1234-1234-123456789abc',
          target: 'https://example1.com',
          status: 'completed',
          createdAt: '2024-01-15T10:30:00Z',
          result: {
            url: 'https://example1.com',
            effectiveUrl: 'https://example1.com',
            present: { 'X-Frame-Options': 'DENY' },
            missing: ['Content-Security-Policy'],
            summary: { safe: 1, unsafe: 1 },
          },
        },
        {
          id: '87654321-4321-4321-4321-cba987654321',
          target: 'https://example2.com',
          status: 'failed',
          createdAt: '2024-01-15T11:00:00Z',
          error: 'Connection error',
          result: null,
        },
        {
          id: 'abcdef12-3456-7890-abcd-ef1234567890',
          target: 'https://example3.com',
          status: 'pending',
          createdAt: '2024-01-15T11:30:00Z',
          result: null,
        },
      ];

      const pdfBuffer = await pdfService.generateBulkReport(mockScans);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('should generate a bulk PDF for a single scan', async () => {
      const mockScans: ScanResponse[] = [
        {
          id: '12345678-1234-1234-1234-123456789abc',
          target: 'https://example.com',
          status: 'completed',
          createdAt: '2024-01-15T10:30:00Z',
          result: {
            url: 'https://example.com',
            effectiveUrl: 'https://example.com',
            present: {},
            missing: [],
            summary: { safe: 0, unsafe: 0 },
          },
        },
      ];

      const pdfBuffer = await pdfService.generateBulkReport(mockScans);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle empty scan results in bulk report', async () => {
      const mockScans: ScanResponse[] = [
        {
          id: '12345678-1234-1234-1234-123456789abc',
          target: 'https://example.com',
          status: 'completed',
          createdAt: '2024-01-15T10:30:00Z',
          result: {
            url: 'https://example.com',
            effectiveUrl: 'https://example.com',
            present: {},
            missing: [],
            summary: { safe: 0, unsafe: 0 },
          },
        },
      ];

      const pdfBuffer = await pdfService.generateBulkReport(mockScans);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });
});
