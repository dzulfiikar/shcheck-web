import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { CreateScanRequest, CreateScanResponse } from '@/types/scan';
import { scansQueryKeys } from './use-scans';

/**
 * Hook to create a new scan
 * Automatically invalidates the scans list on success
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useCreateScan();
 *
 * const handleSubmit = (data: CreateScanRequest) => {
 *   mutate(data, {
 *     onSuccess: (response) => {
 *       console.log('Created scan:', response.jobId);
 *     },
 *   });
 * };
 * ```
 */
export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation<CreateScanResponse, Error, CreateScanRequest>({
    mutationFn: async (data: CreateScanRequest) => {
      const response = await api.api.scans.post(data);

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      return response.data as CreateScanResponse;
    },
    onSuccess: () => {
      // Invalidate the scans list to refetch
      queryClient.invalidateQueries({ queryKey: scansQueryKeys.lists() });
    },
  });
}
