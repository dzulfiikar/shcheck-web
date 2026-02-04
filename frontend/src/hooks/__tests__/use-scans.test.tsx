import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScans, scansQueryKeys } from '../use-scans';
import type { ListScansResponse, ScanResponse } from '@/types/scan';

// Mock the API
const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    api: {
      scans: {
        get: (...args: unknown[]) => mockGet(...args),
      },
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

describe('useScans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Keys', () => {
    it('generates correct query keys for all scans', () => {
      expect(scansQueryKeys.all).toEqual(['scans']);
    });

    it('generates correct query keys for lists', () => {
      expect(scansQueryKeys.lists()).toEqual(['scans', 'list']);
    });

    it('generates correct query keys for a specific list with filters', () => {
      const filters = { page: 1, limit: 20 };
      expect(scansQueryKeys.list(filters)).toEqual(['scans', 'list', filters]);
    });

    it('generates correct query keys for details', () => {
      expect(scansQueryKeys.details()).toEqual(['scans', 'detail']);
    });

    it('generates correct query keys for a specific scan', () => {
      expect(scansQueryKeys.detail('123')).toEqual(['scans', 'detail', '123']);
    });

    it('generates correct query keys for status', () => {
      expect(scansQueryKeys.status('123')).toEqual(['scans', 'status', '123']);
    });
  });

  describe('Fetching', () => {
    it('fetches scans with default options', async () => {
      const mockResponse: ListScansResponse = {
        data: [
          {
            id: '1',
            target: 'https://example.com',
            status: 'completed',
            createdAt: '2024-01-01T00:00:00Z',
          } as ScanResponse,
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse, error: null });

      const { result } = renderHook(() => useScans(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledWith({
        query: { page: 1, limit: 20 },
      });
      expect(result.current.data).toEqual(mockResponse);
    });

    it('fetches scans with custom pagination', async () => {
      const mockResponse: ListScansResponse = {
        data: [],
        total: 0,
        page: 2,
        limit: 10,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse, error: null });

      const { result } = renderHook(() => useScans({ page: 2, limit: 10 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledWith({
        query: { page: 2, limit: 10 },
      });
    });

    it('fetches scans with status filter', async () => {
      const mockResponse: ListScansResponse = {
        data: [
          {
            id: '1',
            target: 'https://example.com',
            status: 'completed',
            createdAt: '2024-01-01T00:00:00Z',
          } as ScanResponse,
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse, error: null });

      const { result } = renderHook(
        () => useScans({ page: 1, limit: 20, status: 'completed' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledWith({
        query: { page: 1, limit: 20, status: 'completed' },
      });
    });

    it('does not include undefined status in query', async () => {
      const mockResponse: ListScansResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse, error: null });

      const { result } = renderHook(
        () => useScans({ page: 1, limit: 20, status: undefined }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should not include status when undefined
      expect(mockGet).toHaveBeenCalledWith({
        query: { page: 1, limit: 20 },
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors correctly', async () => {
      const errorResponse = {
        error: { message: 'Failed to fetch scans' },
      };

      mockGet.mockResolvedValueOnce(errorResponse);

      const { result } = renderHook(() => useScans(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to fetch scans');
    });

    it('handles network errors correctly', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useScans(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('Loading State', () => {
    it('starts in loading state', () => {
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useScans(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('transitions from loading to success', async () => {
      const mockResponse: ListScansResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockGet.mockResolvedValueOnce({ data: mockResponse, error: null });

      const { result } = renderHook(() => useScans(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
