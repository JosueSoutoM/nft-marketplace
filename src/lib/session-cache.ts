import type { QueryClient } from '@tanstack/react-query'
import { getSessionSnapshot, subscribeSession } from '@/api/session-token'
import { queryKeys } from './query-keys'

export function clearPrivateCache(queryClient: QueryClient, userId: string | null): void {
  const prefixes = userId ? [queryKeys.user(userId), queryKeys.guest()] : [queryKeys.guest()]
  for (const queryKey of prefixes) {
    void queryClient.cancelQueries({ queryKey })
    queryClient.removeQueries({ queryKey })
  }
  const mutationCache = queryClient.getMutationCache()
  for (const mutation of mutationCache.getAll()) {
    if (mutation.state.status !== 'pending') {
      mutationCache.remove(mutation)
    }
  }
}

export function installSessionCacheIsolation(queryClient: QueryClient): () => void {
  let previous = getSessionSnapshot().session

  return subscribeSession(() => {
    const { session } = getSessionSnapshot()
    if (session?.token === previous?.token) {
      return
    }
    clearPrivateCache(queryClient, previous?.userId ?? null)
    previous = session
  })
}
