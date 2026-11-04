import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, ShoppingCart } from 'lucide-react'
import { BackButton } from '@/components/layout/back-button'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart, useCartQuote } from '@/hooks/use-cart'
import { cartItemBlockingIssue } from '@/lib/cart-changes'
import { cn } from '@/lib/utils'
import { CartItemRow } from './cart-item-row'
import { CartSummary } from './cart-summary'
import { cartColumnsClass, cartGridClass, cartListClass, cartRowClass, summaryPanelClass } from './layout'
import { RelatedNfts } from './related-nfts'
import { useCartItemNotices } from './use-cart-item-notices'

const SKELETON_ROWS = 3

export function CartPage() {
  const cart = useCart()
  const quote = useCartQuote(cart.data)
  const notices = useCartItemNotices(cart.data)
  const listRef = useRef<HTMLUListElement>(null)
  const emptyRef = useRef<HTMLHeadingElement>(null)
  const items = cart.data?.items ?? []

  function focusAfterRemoval() {
    requestAnimationFrame(() => (listRef.current ?? emptyRef.current)?.focus())
  }

  function renderContent() {
    if (cart.isPending) {
      return <CartSkeleton />
    }
    if (!cart.data) {
      return (
        <div role="alert" className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center">
          <AlertTriangle className="size-10 text-text-accent" aria-hidden="true" />
          <h2 className="text-body-lg font-bold text-foreground">Não foi possível carregar o carrinho</h2>
          <p className="text-body-sm text-text-secondary">{cart.error?.message ?? 'Tente novamente em instantes.'}</p>
          <Button onClick={() => void cart.refetch()} className="mt-2 font-bold">
            Tentar novamente
          </Button>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center">
          <ShoppingCart className="size-10 text-text-accent" aria-hidden="true" />
          <h2 ref={emptyRef} tabIndex={-1} className="text-body-lg font-bold text-foreground outline-none">
            Seu carrinho está vazio
          </h2>
          <p className="text-body-sm text-text-secondary">Explore o catálogo e escolha a edição e a quantidade de um NFT.</p>
          <Button asChild className="mt-2 font-bold">
            <Link to="/" hash={CATALOG_HASH}>
              Explorar o catálogo
            </Link>
          </Button>
        </div>
      )
    }
    const blocked = items.some((item) => cartItemBlockingIssue(item) !== null) || quote.data?.purchasable === false
    return (
      <div className={cn(cartGridClass, 'mt-6 md:mt-1')}>
        <div className="min-w-0">
          <CartTableHeader />
          <ul
            ref={listRef}
            tabIndex={-1}
            aria-label="Itens do carrinho"
            className={cn(cartListClass, 'outline-none md:mt-4')}
          >
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} notice={notices.get(item.id)} onRemoved={focusAfterRemoval} />
            ))}
          </ul>
          {cart.isError && (
            <p role="alert" className="mt-4 text-body-sm text-text-coral">
              Não foi possível atualizar o carrinho: {cart.error.message}
            </p>
          )}
        </div>
        <CartSummary
          cart={cart.data}
          quote={quote.data}
          quoteError={quote.error}
          quotePending={quote.isPending}
          quoteRefreshing={quote.isFetching && !quote.isPending}
          blocked={blocked}
          onRetryQuote={() => void quote.refetch()}
        />
      </div>
    )
  }

  return (
    <Container className="pt-6 pb-16 md:pt-6 md:pb-24">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center md:block">
        <BackButton className="md:hidden" />
        <h1 className="text-center text-[1.25rem] leading-7 font-bold text-foreground md:sr-only">Carrinho de NFTs</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="hidden h-6 items-center text-body-sm font-bold text-foreground md:flex">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash={CATALOG_HASH} className="hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>

      <div aria-busy={cart.isPending} className="md:mt-2">
        {renderContent()}
      </div>

      <RelatedNfts excludeNftIds={items.map((item) => item.nftId)} />
    </Container>
  )
}

function CartTableHeader() {
  return (
    <div
      aria-hidden="true"
      className={cn('hidden border-b border-border-soft pb-2 text-body font-bold text-foreground md:grid', cartColumnsClass)}
    >
      <span className="col-span-2">NFTs</span>
      <span>Preço</span>
      <span>Edições</span>
      <span>Total</span>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className={cn(cartGridClass, 'mt-6 md:mt-1')}>
      <p className="sr-only">Carregando o carrinho…</p>
      <div aria-hidden="true" className="min-w-0">
        <CartTableHeader />
        <div className={cn(cartListClass, 'md:mt-4')}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div key={index} data-slot="cart-item-skeleton" className={cn(cartRowClass, cartColumnsClass, 'relative')}>
              <Skeleton className="h-[5.875rem] w-full rounded-[1.25rem] max-md:col-start-1 max-md:row-span-2 max-md:row-start-1 md:h-[4.375rem] md:rounded-none" />
              <div className="flex flex-col gap-2 pt-3 pl-4 max-md:col-span-2 max-md:col-start-2 max-md:row-start-1 max-md:pr-11 md:px-[1.125rem] md:pt-0">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16 max-md:hidden" />
              <Skeleton className="mr-3 mb-3 h-8 w-24 self-end max-md:col-start-3 max-md:row-start-2 md:m-0 md:h-7 md:self-center" />
              <Skeleton className="mx-4 mb-3 h-5 w-20 self-end max-md:col-start-2 max-md:row-start-2 md:m-0 md:self-center" />
              <Skeleton className="size-6 max-md:absolute max-md:top-3 max-md:right-3 md:self-center" />
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className={summaryPanelClass}>
        <Skeleton className="hidden h-6 w-48 md:block" />
        <Skeleton className="hidden h-4 w-36 md:mt-7 md:block" />
        <Skeleton className="h-14 w-full rounded-full md:mt-2.5 md:h-[2.875rem] md:rounded-none" />
        <div className="mt-6 flex flex-col gap-2 md:mt-7">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex h-8 items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
          <div className="mt-5 flex h-8 items-center justify-between">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <Skeleton className="mt-7 h-14 w-full rounded-full md:h-10 md:rounded-none" />
      </div>
    </div>
  )
}
