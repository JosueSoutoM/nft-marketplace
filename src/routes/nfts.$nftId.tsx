import { createFileRoute } from '@tanstack/react-router'
import { Container } from '@/components/layout/container'
import { PageHeading } from '@/components/layout/page-heading'

export const Route = createFileRoute('/nfts/$nftId')({
  staticData: { hideMobileTabBar: true },
  component: NftDetailsPage,
})

function NftDetailsPage() {
  return (
    <Container className="py-8 md:py-12">
      <PageHeading withBackButton>Detalhes do NFT</PageHeading>
    </Container>
  )
}
