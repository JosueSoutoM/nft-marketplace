import { useId } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import type { Cart, Quote } from '@/api/contracts'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { CouponForm } from './coupon-form'
import { summaryPanelClass, summaryRowClass, summaryValueClass } from './layout'

const checkoutClass =
  'h-14 w-full rounded-full bg-linear-to-r from-primary-light to-primary-dark text-body-lg font-bold md:h-10 md:rounded-none md:bg-none md:bg-primary md:text-body'

type CartSummaryProps = {
  cart: Cart
  quote: Quote | undefined
  quoteError: Error | null
  quotePending: boolean
  quoteRefreshing: boolean
  blocked: boolean
  onRetryQuote: () => void
}

export function CartSummary({ cart, quote, quoteError, quotePending, quoteRefreshing, blocked, onRetryQuote }: CartSummaryProps) {
  const blockedId = useId()

  return (
    <section aria-labelledby="cart-summary-title" className={summaryPanelClass}>
      <h2
        id="cart-summary-title"
        className="text-body-lg font-bold text-foreground max-md:sr-only md:border-b md:border-border-soft md:pb-2.5"
      >
        Resumo da carteira
      </h2>

      <div className="md:mt-7">
        <CouponForm cart={cart} quote={quote} />
      </div>

      {quoteError && !quote ? (
        <div role="alert" className="mt-6 flex flex-col items-start gap-3 rounded-md bg-surface-raised p-4 text-body-sm">
          <p className="text-foreground">Não foi possível calcular o resumo.</p>
          <p className="text-text-secondary">{quoteError.message}</p>
          <Button size="sm" onClick={onRetryQuote} className="font-bold">
            Tentar novamente
          </Button>
        </div>
      ) : (
        <SummaryValues quote={quote} loading={quotePending} refreshing={quoteRefreshing} />
      )}

      <div className="mt-7">
        {blocked ? (
          <>
            <Button aria-disabled="true" aria-describedby={blockedId} className={cn(checkoutClass, 'cursor-not-allowed opacity-60')}>
              Conectar e finalizar
            </Button>
            <p id={blockedId} className="mt-2 flex items-start gap-2 text-caption text-text-coral">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Ajuste os itens destacados no carrinho para continuar.
            </p>
          </>
        ) : (
          <Button asChild className={checkoutClass}>
            <Link to="/checkout">Conectar e finalizar</Link>
          </Button>
        )}
        <Link
          to="/"
          hash={CATALOG_HASH}
          className="mt-5 hidden text-center text-body text-text-accent hover:underline md:block"
        >
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}

function SummaryValues({ quote, loading, refreshing }: { quote: Quote | undefined; loading: boolean; refreshing: boolean }) {
  const value = (render: (data: Quote) => string, width: string) =>
    quote ? render(quote) : <Skeleton className={cn('ml-auto h-5', width)} />

  return (
    <>
      {loading && <p className="sr-only">Calculando o resumo…</p>}
      <dl
        data-slot="cart-summary"
        aria-busy={loading || refreshing}
        className={cn('mt-6 transition-opacity md:mt-7', refreshing && 'opacity-60')}
      >
        <div className={summaryRowClass}>
          <dt>Subtotal</dt>
          <dd data-slot="summary-subtotal" className={cn(summaryValueClass, 'flex min-h-8 items-center')}>
            {value((data) => formatEth(data.subtotal), 'w-24')}
          </dd>
        </div>
        <div className={summaryRowClass}>
          <dt>{quote?.coupon?.label ?? 'Desconto do lançamento'}</dt>
          <dd data-slot="summary-discount" className={cn(summaryValueClass, 'flex min-h-8 items-center text-[0.9375rem]')}>
            {value((data) => `(-) ${formatEth(data.discount)}`, 'w-20')}
          </dd>
        </div>
        <div className={summaryRowClass}>
          <dt>Taxa de rede</dt>
          <dd className="flex flex-col items-end">
            <span data-slot="summary-fee" className={cn(summaryValueClass, 'flex min-h-8 items-center')}>
              {value((data) => formatEth(data.networkFee), 'w-20')}
            </span>
            <span className={cn('text-caption text-text-accent', quote && !quote.networkFeeEstimated && 'invisible')}>
              Taxa estimada
            </span>
          </dd>
        </div>
        <div className={cn(summaryRowClass, 'mt-5 items-center font-bold')}>
          <dt className="text-body-lg">Total</dt>
          <dd data-slot="summary-total" className="flex min-h-8 items-center text-right text-[1.25rem] leading-8 font-bold text-text-accent">
            {value((data) => formatEth(data.total), 'w-28')}
          </dd>
        </div>
      </dl>
    </>
  )
}
