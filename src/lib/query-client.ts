import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

export const MAX_TRANSIENT_RETRIES = 2

export function retryTransientErrors(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_TRANSIENT_RETRIES && isApiError(error) && error.isTransient
}

export function retryDelay(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4000)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: retryTransientErrors,
      retryDelay,
    },
  },
})
