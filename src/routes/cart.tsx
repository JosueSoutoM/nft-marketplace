import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { PageHeading } from '@/components/layout/page-heading'

export const Route = createFileRoute('/cart')({
  staticData: { hideMobileTabBar: true },
  component: CartPage,
})

function CartPage() {
  return (
    <Container className="py-8 md:py-12">
      <PageHeading withBackButton>Carrinho de NFTs</PageHeading>
    </Container>
  )
}
