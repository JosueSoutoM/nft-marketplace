import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { Logo } from '@/components/layout/logo'
import { PageHeading } from '@/components/layout/page-heading'
import { sanitizeRedirect } from '@/lib/redirect'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  staticData: { hideMobileTabBar: true },
  component: LoginPage,
})

function LoginPage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="mb-12 flex justify-center pt-8 md:hidden">
        <Logo className="text-heading" />
      </div>
      <PageHeading>Entrar</PageHeading>
    </Container>
  )
}
