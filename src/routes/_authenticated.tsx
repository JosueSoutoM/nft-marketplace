import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { getSessionSnapshot } from '@/api/session-token'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { loadSession } from '@/hooks/use-session'
import { toSessionNotice } from '@/lib/session-end'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const hadSession = getSessionSnapshot().session !== null
    const session = await loadSession(context.queryClient)
    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
          reason: hadSession ? toSessionNotice(getSessionSnapshot().endReason) : undefined,
        },
        replace: true,
      })
    }
    return { session }
  },
  errorComponent: SessionCheckError,
  component: Outlet,
})

function SessionCheckError() {
  const router = useRouter()

  return (
    <Container className="py-16">
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-md bg-surface-card p-8 text-center">
        <h1 className="text-title text-foreground">Não foi possível verificar sua sessão</h1>
        <p className="text-body-sm text-text-secondary">Verifique sua conexão e tente novamente.</p>
        <Button type="button" onClick={() => void router.invalidate()}>
          Tentar novamente
        </Button>
      </div>
    </Container>
  )
}
