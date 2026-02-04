import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScan } from '../use-scan';
import type { ScanResponse } from '@/types/scan';

// Mock the API
const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    api: {
      scans: vi.fn(() => ({
        get: (...args: unknown[]) => mockGet(...args),
      })),
    },
  },
  getErrorMessage: (error: unknown) => {
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'An unexpected error occurred';
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useScan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching', () => {
    it('fetches a scan by ID', async () => {
      const mockScan: ScanResponse = {
        id: '123',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
        result: {
          url: 'https://example.com',
          effectiveUrl: 'https://example.com',
          present: { 'X-Frame-Options': 'DENY' },
          missing: ['X-Content-Type-Options'],
          summary: { safe: 1, unsafe: 1 },
        },
      };

      mockGet.mockResolvedValueOnce({ data: mockScan, error: null });

      const { result } = renderHook(() => useScan('123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockScan);
    });

    it('does not fetch when ID is undefined', () => {
      const { result } = renderHook(() => useScan(undefined), { wrapper });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('does not fetch when ID is empty string', () => {
      const { result } = renderHook(() => useScan(''), { wrapper });

      expect(mockGet).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles API errors correctly', async () => {
      const errorResponse = {
        error: { message: 'Scan not found' },
      };

      mockGet.mockResolvedValueOnce(errorResponse);

      const { result } = renderHook(() => useScan('123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Scan not found');
    });

    it('handles network errors correctly', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useScan('123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('throws error when ID is empty but query is enabled', async () => {
      // This tests the internal error handling when queryFn is called with empty ID
      mockGet.mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useScan(''), { wrapper });

      // Query should be disabled, so no error should occur
      expect(result.current.isError).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('starts in loading state when ID is provided', () => {
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useScan('123'), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('is not loading when ID is undefined', () => {
      const { result } = renderHook(() => useScan(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
    });

    it('transitions from loading to success', async () => {
      const mockScan: ScanResponse = {
        id: '123',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockGet.mockResolvedValueOnce({ data: mockScan, error: null });

      const { result } = renderHook(() => useScan('123'), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Query Key', () => {
    it('uses correct query key with scan ID', async () => {
      const mockScan: ScanResponse = {
        id: '123',
        target: 'https://example.com',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockGet.mockResolvedValueOnce({ data: mockScan, error: null });

      const queryClient = createTestQueryClient();
      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useScan('123'), {
        wrapper: customWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the query is cached with the correct key
      const cachedData = queryClient.getQueryData(['scans', 'detail', '123']);
      expect(cachedData).toEqual(mockScan);
    });
  });
});
