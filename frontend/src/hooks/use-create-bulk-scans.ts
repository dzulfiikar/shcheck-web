import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { BulkCreateScanRequest, BulkCreateScanResponse } from '@/types/scan';
import { scansQueryKeys } from './use-scans';

/**
 * Hook to create multiple scans from newline-separated URLs
 * Automatically invalidates the scans list on success
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useCreateBulkScans();
 *
 * const handleSubmit = (data: BulkCreateScanRequest) => {
 *   mutate(data, {
 *     onSuccess: (response) => {
 *       console.log(`Created ${response.created} of ${response.total} scans`);
 *       if (response.errors) {
 *         console.log('Failed URLs:', response.errors);
 *       }
 *     },
 *   });
 * };
 * ```
 */
export function useCreateBulkScans() {
  const queryClient = useQueryClient();

  return useMutation<BulkCreateScanResponse, Error, BulkCreateScanRequest>({
    mutationFn: async (data: BulkCreateScanRequest) => {
      const response = await api.api.scans.bulk.post(data);

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      return response.data as BulkCreateScanResponse;
    },
    onSuccess: () => {
      // Invalidate the scans list to refetch
      queryClient.invalidateQueries({ queryKey: scansQueryKeys.lists() });
    },
  });
}
