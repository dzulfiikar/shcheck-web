import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDownloadScanPDF } from '../use-download-scan-pdf';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

describe('useDownloadScanPDF', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalEnv: string | undefined;
  let originalCreateObjectURL: typeof window.URL.createObjectURL;
  let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = import.meta.env.VITE_API_URL;
    originalCreateObjectURL = window.URL.createObjectURL;
    originalRevokeObjectURL = window.URL.revokeObjectURL;
    import.meta.env.VITE_API_URL = 'http://localhost:3001';

    mockFetch = vi.fn();
    global.fetch = mockFetch;
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL;
    window.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;

    const mockLink = document.createElement('a');
    mockLink.click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
  });

  afterEach(() => {
    import.meta.env.VITE_API_URL = originalEnv;
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('should call fetch with correct URL', async () => {
    const mockBlob = new Blob(['PDF'], { type: 'application/pdf' });
    mockFetch.mockResolvedValueOnce({ ok: true, blob: () => Promise.resolve(mockBlob) });

    const { result } = renderHook(() => useDownloadScanPDF(), { wrapper });
    result.current.mutate('scan-id-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/scans/scan-id-123/pdf',
      { method: 'GET', credentials: 'include' }
    );
  });

  it('should handle 404 error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 404,
      json: () => Promise.resolve({ message: 'Scan not found' }),
    });

    const { result } = renderHook(() => useDownloadScanPDF(), { wrapper });
    result.current.mutate('non-existent');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Scan not found');
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDownloadScanPDF(), { wrapper });
    result.current.mutate('scan-id');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});
