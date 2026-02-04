import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { ScanStatusResponse } from '@/types/scan';
import { scansQueryKeys } from './use-scans';

/**
 * Hook to poll scan status
 * Automatically polls every 2 seconds while the scan is pending or processing
 * Stops polling when the scan is completed or failed
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useScanStatus('123e4567-e89b-12d3-a456-426614174000');
 *
 * // data.status will be 'pending' | 'processing' | 'completed' | 'failed'
 * // data.progress will be a number between 0-100 when processing
 * ```
 */
export function useScanStatus(id: string | undefined) {
  return useQuery<ScanStatusResponse>({
    queryKey: scansQueryKeys.status(id || ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Scan ID is required');
      }

      const response = await api.api.scans({ id }).status.get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      return response.data as ScanStatusResponse;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as ScanStatusResponse | undefined;

      // Poll every 2 seconds until completed or failed
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 2000;
      }

      // Stop polling for completed or failed scans
      return false;
    },
  });
}
