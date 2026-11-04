import { useSyncExternalStore } from 'react'
import { realtimeClient, type RealtimeStatus } from './client'

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(realtimeClient.subscribe, realtimeClient.getStatus)
}
