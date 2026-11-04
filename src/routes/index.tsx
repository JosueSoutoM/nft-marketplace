import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { PageHeading } from '@/components/layout/page-heading'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <Container className="py-8 md:py-12">
      <PageHeading>Início</PageHeading>
    </Container>
  )
}
