import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { PageHeading } from '@/components/layout/page-heading'

export const Route = createFileRoute('/_authenticated/checkout')({
  staticData: { hideMobileTabBar: true },
  component: CheckoutPage,
})

function CheckoutPage() {
  return (
    <Container className="py-8 md:py-12">
      <PageHeading withBackButton>Pagamento</PageHeading>
    </Container>
  )
}
