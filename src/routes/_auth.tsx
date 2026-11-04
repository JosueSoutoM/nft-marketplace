import { createFileRoute, Outlet, redirect, useMatch } from '@tanstack/react-router'
import { AuthDialog } from '@/components/auth/auth-dialog'
import { AuthPage } from '@/components/auth/auth-page'
import { HomePage } from '@/components/home/home-page'
import { DESKTOP_AUTH_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { loadSession } from '@/hooks/use-session'
import { sanitizeRedirect } from '@/lib/redirect'
import { parseSessionNotice, type SessionNotice } from '@/lib/session-end'

type AuthSearch = {
  redirect?: string
  reason?: SessionNotice
}

export const Route = createFileRoute('/_auth')({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: sanitizeRedirect(search.redirect),
    reason: parseSessionNotice(search.reason),
  }),
  beforeLoad: async ({ context, search }) => {
    const session = await loadSession(context.queryClient).catch(() => null)
    if (session) {
      throw redirect({ href: search.redirect ?? '/', replace: true })
    }
  },
  staticData: { hideMobileTabBar: true },
  component: AuthLayout,
})

function AuthLayout() {
  const { redirect } = Route.useSearch()
  const desktop = useMediaQuery(DESKTOP_AUTH_QUERY)
  const mode = useMatch({ from: '/_auth/register', shouldThrow: false }) ? 'register' : 'login'

  if (desktop) {
    return (
      <>
        <HomePage />
        <AuthDialog mode={mode} redirect={redirect}>
          <Outlet />
        </AuthDialog>
      </>
    )
  }
  return (
    <AuthPage mode={mode} redirect={redirect}>
      <Outlet />
    </AuthPage>
  )
}
