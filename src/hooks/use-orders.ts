import { useQuery } from '@tanstack/react-query'
import { listOrders } from '@/api/orders'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from './use-session'

export function usePendingOrders() {
  const { userId } = useSession()
  return useQuery({
    queryKey: queryKeys.orders.list(userId ?? '', { status: 'pending' }),
    queryFn: ({ signal }) => listOrders({ status: 'pending' }, { signal }),
    enabled: userId !== null,
    staleTime: 0,
    select: (data) => data.items,
  })
}
