import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { BackButton } from '@/components/layout/back-button'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Button } from '@/components/ui/button'

const stateClass =
  'mt-6 flex min-h-[24rem] flex-col items-center justify-center rounded-[1.25rem] bg-surface-card px-6 py-16 text-center md:mt-10 md:rounded-sm'

export function NftNotFoundState() {
  return (
    <Container className="py-6 md:py-12">
      <BackButton className="md:hidden" />
      <div className={stateClass}>
        <p className="text-display-sm text-primary md:text-display" aria-hidden="true">
          404
        </p>
        <h1 className="mt-2 text-heading text-foreground">NFT não encontrado</h1>
        <p className="mt-3 max-w-[28rem] text-body-sm text-text-secondary">
          Este NFT não existe ou foi removido do mercado. Explore o catálogo para encontrar outras obras.
        </p>
        <Button asChild className="mt-8 font-bold">
          <Link to="/" hash={CATALOG_HASH}>
            Voltar ao catálogo
          </Link>
        </Button>
      </div>
    </Container>
  )
}

type NftLoadErrorProps = {
  message: string
  retrying: boolean
  onRetry: () => void
}

export function NftLoadError({ message, retrying, onRetry }: NftLoadErrorProps) {
  return (
    <Container className="py-6 md:py-12">
      <BackButton className="md:hidden" />
      <div role="alert" className={stateClass}>
        <AlertTriangle className="size-10 text-text-accent" aria-hidden="true" />
        <h1 className="mt-3 text-body-lg font-bold text-foreground">Não foi possível carregar este NFT</h1>
        <p className="mt-2 max-w-md text-body-sm text-text-secondary">{message}</p>
        <Button onClick={onRetry} disabled={retrying} className="mt-6 font-bold">
          {retrying ? 'Carregando…' : 'Tentar novamente'}
        </Button>
      </div>
    </Container>
  )
}
