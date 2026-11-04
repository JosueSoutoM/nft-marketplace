import { useSyncExternalStore } from 'react'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { getSession } from '@/api/auth'
import type { Session, SessionUser } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { getSessionSnapshot, subscribeSession, type SessionSnapshot } from '@/api/session-token'
import { queryKeys } from '@/lib/query-keys'

const EXPIRY_CHECK_MARGIN_MS = 1000
const MAX_TIMER_MS = 2_147_483_647

export type SessionStatus = 'anonymous' | 'pending' | 'authenticated'

export interface SessionState {
  status: SessionStatus
  userId: string | null
  user: SessionUser | null
  isError: boolean
}

export function useStoredSession(): SessionSnapshot {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot)
}

function sessionQueryOptions(userId: string) {
  return {
    queryKey: queryKeys.session(userId),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const session = await getSession({ signal })
      if (session.user.id !== userId) {
        throw new Error('A sessão mudou durante a consulta.')
      }
      return session
    },
  }
}

function untilExpiry(session: Session | undefined): number | false {
  if (!session) {
    return false
  }
  const remaining = Date.parse(session.expiresAt) - Date.now() + EXPIRY_CHECK_MARGIN_MS
  return Math.min(Math.max(remaining, EXPIRY_CHECK_MARGIN_MS), MAX_TIMER_MS)
}

export function useSession(): SessionState {
  const { session: stored } = useStoredSession()
  const userId = stored?.userId ?? null
  const query = useQuery({
    ...sessionQueryOptions(userId ?? ''),
    enabled: userId !== null,
    staleTime: 60_000,
    refetchInterval: (current) => untilExpiry(current.state.data),
  })

  if (!userId) {
    return { status: 'anonymous', userId: null, user: null, isError: false }
  }
  if (!query.data) {
    return { status: 'pending', userId, user: null, isError: query.isError }
  }
  return { status: 'authenticated', userId, user: query.data.user, isError: false }
}

export async function loadSession(queryClient: QueryClient): Promise<Session | null> {
  const stored = getSessionSnapshot().session
  if (!stored) {
    return null
  }
  try {
    return await queryClient.fetchQuery({ ...sessionQueryOptions(stored.userId), staleTime: 0 })
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      return null
    }
    throw error
  }
}
