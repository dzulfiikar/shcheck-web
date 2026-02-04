import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateBulkScans } from '../use-create-bulk-scans';
import { api } from '@/lib/api';

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    api: {
      scans: {
        bulk: {
          post: vi.fn(),
        },
      },
    },
  },
  getErrorMessage: (error: { message?: string }) => error.message || 'Unknown error',
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
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

describe('useCreateBulkScans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create bulk scans successfully', async () => {
    const mockResponse = {
      data: {
        jobs: [
          { jobId: 'uuid-1', status: 'pending' as const },
          { jobId: 'uuid-2', status: 'pending' as const },
        ],
        total: 2,
        created: 2,
      },
      error: null,
    };

    vi.mocked(api.api.scans.bulk.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateBulkScans(), { wrapper });

    result.current.mutate({
      targets: 'https://example.com\nhttps://test.com',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse.data);
    expect(api.api.scans.bulk.post).toHaveBeenCalledWith({
      targets: 'https://example.com\nhttps://test.com',
    });
  });

  it('should handle errors when bulk scan fails', async () => {
    const mockError = {
      error: {
        message: 'Failed to create scan jobs',
      },
    };

    vi.mocked(api.api.scans.bulk.post).mockResolvedValue(mockError);

    const { result } = renderHook(() => useCreateBulkScans(), { wrapper });

    result.current.mutate({
      targets: 'https://example.com',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });

  it('should handle partial failures with errors array', async () => {
    const mockResponse = {
      data: {
        jobs: [{ jobId: 'uuid-1', status: 'pending' as const }],
        total: 2,
        created: 1,
        errors: [{ target: 'invalid-url', error: 'Invalid URL' }],
      },
      error: null,
    };

    vi.mocked(api.api.scans.bulk.post).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateBulkScans(), { wrapper });

    result.current.mutate({
      targets: 'https://example.com\ninvalid-url',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.created).toBe(1);
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.errors).toHaveLength(1);
  });
});
