import { useQuery } from '@tanstack/react-query'
import { listNetworks } from '@/api/networks'
import { queryKeys } from '@/lib/query-keys'

export function useNetworks() {
  return useQuery({
    queryKey: queryKeys.networks(),
    queryFn: ({ signal }) => listNetworks({ signal }),
    staleTime: 5 * 60_000,
    select: (data) => data.items,
  })
}
