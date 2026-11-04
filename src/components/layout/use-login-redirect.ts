import { useRouterState } from '@tanstack/react-router'
import { isAuthPath, sanitizeRedirect } from '@/lib/redirect'

export function useLoginRedirect() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const href = useRouterState({ select: (state) => state.location.href })

  if (isAuthPath(pathname)) {
    return undefined
  }
  return sanitizeRedirect(href)
}
