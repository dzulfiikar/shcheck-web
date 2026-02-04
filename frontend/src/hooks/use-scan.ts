import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { ScanResponse } from '@/types/scan';
import { scansQueryKeys } from './use-scans';

/**
 * Hook to fetch a single scan by ID
 * Automatically disabled if no ID is provided
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useScan('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export function useScan(id: string | undefined) {
  return useQuery<ScanResponse>({
    queryKey: scansQueryKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Scan ID is required');
      }

      const response = await api.api.scans({ id }).get();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      return response.data as ScanResponse;
    },
    enabled: !!id,
  });
}
