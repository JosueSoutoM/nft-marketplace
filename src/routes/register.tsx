import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { Logo } from '@/components/layout/logo'
import { PageHeading } from '@/components/layout/page-heading'

export const Route = createFileRoute('/register')({
  staticData: { hideMobileTabBar: true },
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <Container className="py-8 md:py-12">
      <div className="mb-12 flex justify-center pt-8 md:hidden">
        <Logo className="text-heading" />
      </div>
      <PageHeading>Criar perfil de colecionador</PageHeading>
    </Container>
  )
}
