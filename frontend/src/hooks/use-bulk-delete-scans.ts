import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { scansQueryKeys } from './use-scans';
import type { BulkDeleteRequest, BulkDeleteResponse } from '@/types/scan';

/**
 * Hook to delete multiple scans at once
 * Automatically invalidates the scans list on success
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useBulkDeleteScans();
 *
 * const handleBulkDelete = (ids: string[]) => {
 *   mutate({ ids }, {
 *     onSuccess: (result) => {
 *       console.log(`Deleted ${result.deleted} scans`);
 *     },
 *   });
 * };
 * ```
 */
export function useBulkDeleteScans() {
  const queryClient = useQueryClient();

  return useMutation<BulkDeleteResponse, Error, BulkDeleteRequest>({
    mutationFn: async (data: BulkDeleteRequest) => {
      const response = await api.api.scans['bulk-delete'].post(data);

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      return response.data as BulkDeleteResponse;
    },
    onSuccess: () => {
      // Invalidate the scans list to refetch
      queryClient.invalidateQueries({ queryKey: scansQueryKeys.lists() });
    },
  });
}
