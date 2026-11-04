import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { PageHeading } from '@/components/layout/page-heading'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  return (
    <Container className="py-8 md:py-12">
      <PageHeading>Confirmação de pedido</PageHeading>
    </Container>
  )
}
