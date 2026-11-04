import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Order } from '@/api/contracts'
import { getOrder, listOrders } from '@/api/orders'
import { queryKeys } from '@/lib/query-keys'
import { isTerminalOrder } from '@/realtime/cache-updates'
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

export function newestOrder(cached: Order | undefined, incoming: Order): Order {
  if (!cached) {
    return incoming
  }
  if (isTerminalOrder(cached) && !isTerminalOrder(incoming)) {
    return cached
  }
  return cached.version > incoming.version ? cached : incoming
}

export function useOrder(orderId: string) {
  const { userId } = useSession()
  const queryClient = useQueryClient()
  const queryKey = queryKeys.orders.detail(userId ?? '', orderId)
  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const order = await getOrder(orderId, { signal })
      return newestOrder(queryClient.getQueryData<Order>(queryKey), order)
    },
    enabled: userId !== null,
    staleTime: (query) => (isTerminalOrder(query.state.data) ? Infinity : 0),
  })
}
