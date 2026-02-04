import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import type { ListScansQuery, ListScansResponse } from '@/types/scan';

/**
 * Query key factory for scans
 */
export const scansQueryKeys = {
  all: ['scans'] as const,
  lists: () => [...scansQueryKeys.all, 'list'] as const,
  list: (filters: ListScansQuery) =>
    [...scansQueryKeys.lists(), filters] as const,
  details: () => [...scansQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...scansQueryKeys.details(), id] as const,
  status: (id: string) => [...scansQueryKeys.all, 'status', id] as const,
};

/**
 * Hook to fetch a paginated list of scans
 * Supports filtering by status
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useScans({ page: 1, limit: 20 });
 * ```
 */
export function useScans(options: ListScansQuery = {}) {
  const { page = 1, limit = 20, status, search } = options;

  return useQuery<ListScansResponse>({
    queryKey: scansQueryKeys.list(options),
    queryFn: async () => {
      const response = await api.api.scans.get({
        query: {
          page,
          limit,
          ...(status && { status }),
          ...(search && { search }),
        },
      });

      if (response.error) {
        throw new Error(getErrorMessage(response.error));
      }

      return response.data as ListScansResponse;
    },
  });
}
