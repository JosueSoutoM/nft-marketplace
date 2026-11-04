import { useEffect } from 'react'
import { useRouter, type AnyRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getSessionSnapshot, subscribeSession, type SessionEndReason } from '@/api/session-token'
import { isAuthPath, isPrivatePath, loginRedirectFor } from '@/lib/redirect'
import { SESSION_NOTICES, toSessionNotice } from '@/lib/session-end'
import { clearResumeDrafts, notifySessionInterrupted } from '@/lib/session-resume'

function whenRouterIdle(router: AnyRouter, callback: () => void): void {
  if (router.state.status !== 'pending') {
    callback()
    return
  }
  const unsubscribe = router.subscribe('onResolved', () => {
    unsubscribe()
    callback()
  })
}

function handleSessionEnd(router: AnyRouter, reason: SessionEndReason): void {
  if (reason === 'logout') {
    clearResumeDrafts()
    whenRouterIdle(router, () => {
      if (isPrivatePath(router, router.state.location.href)) {
        void router.navigate({ to: '/', replace: true })
      }
    })
    return
  }

  const notice = toSessionNotice(reason)
  if (!notice) {
    return
  }
  notifySessionInterrupted()
  toast.warning(SESSION_NOTICES[notice].title, {
    id: 'session-ended',
    description: SESSION_NOTICES[notice].description,
  })
  whenRouterIdle(router, () => {
    const { href, pathname } = router.state.location
    if (isAuthPath(pathname)) {
      return
    }
    if (notice === 'expired' || isPrivatePath(router, href)) {
      void router.navigate({ to: '/login', search: { redirect: loginRedirectFor(href), reason: notice }, replace: true })
    }
  })
}

export function SessionWatcher() {
  const router = useRouter()

  useEffect(
    () =>
      subscribeSession(() => {
        const { session, endReason } = getSessionSnapshot()
        if (!session && endReason) {
          handleSessionEnd(router, endReason)
        }
      }),
    [router],
  )

  return null
}
