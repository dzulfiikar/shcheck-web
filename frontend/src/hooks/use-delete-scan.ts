import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { scansQueryKeys } from './use-scans';

/**
 * Hook to delete a single scan
 * Automatically invalidates the scans list on success
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useDeleteScan();
 *
 * const handleDelete = (id: string) => {
 *   mutate(id, {
 *     onSuccess: () => {
 *       console.log('Scan deleted');
 *     },
 *   });
 * };
 * ```
 */
export function useDeleteScan() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await api.api.scans({ id }).delete();

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }
    },
    onSuccess: () => {
      // Invalidate the scans list to refetch
      queryClient.invalidateQueries({ queryKey: scansQueryKeys.lists() });
    },
  });
}
