import { useEffect, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSessionSnapshot, subscribeSession } from '@/api/session-token'
import { realtimeClient } from './client'

export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const { session } = useSyncExternalStore(subscribeSession, getSessionSnapshot)
  const token = session?.token ?? null
  const userId = session?.userId ?? null

  useEffect(() => {
    void realtimeClient.start(queryClient, { token, userId })
    return () => realtimeClient.stop()
  }, [queryClient, token, userId])

  return null
}
