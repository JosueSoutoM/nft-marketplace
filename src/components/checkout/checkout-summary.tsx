import { Link } from '@tanstack/react-router'
import type { Quote } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatQuoteExpiry } from '@/lib/quote-changes'
import { QuoteLineItem, QuoteLinesSkeleton, QuoteTotals } from './quote-parts'

type CheckoutSummaryProps = {
  quote: Quote | undefined
  loading: boolean
  refreshing: boolean
  error: Error | null
  skeletonRows: number
  onRetry: () => void
}

export function CheckoutSummary({ quote, loading, refreshing, error, skeletonRows, onRetry }: CheckoutSummaryProps) {
  const showSkeleton = !quote && !error
  return (
    <section aria-labelledby="checkout-summary-title" aria-busy={loading || refreshing} className="min-w-0">
      <h2 id="checkout-summary-title" className="text-body-lg font-bold text-foreground md:text-[1.1875rem] md:leading-7">
        Seus NFTs
      </h2>
      <div aria-hidden="true" className="mt-1 flex justify-between border-b border-border-soft pb-2 text-body font-bold text-foreground">
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>

      {showSkeleton && <p className="sr-only">Calculando a cotação…</p>}
      {error && !quote ? (
        <div role="alert" className="mt-4 flex flex-col items-start gap-3 rounded-sm bg-surface-raised p-4 text-body-sm">
          <p className="text-foreground">Não foi possível calcular a cotação.</p>
          <p className="text-text-secondary">{error.message}</p>
          <Button size="sm" onClick={onRetry} className="font-bold">
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
          <div className="mt-4">
            {quote ? (
              <ul aria-label="Itens da cotação" className="flex flex-col gap-3">
                {quote.lines.map((line) => (
                  <QuoteLineItem key={line.cartItemId} line={line} />
                ))}
              </ul>
            ) : (
              <QuoteLinesSkeleton rows={skeletonRows} />
            )}
          </div>

          <p className="mt-4 text-center text-body-sm text-foreground">
            Tem um código promocional?{' '}
            <Link to="/cart" className="text-text-accent underline-offset-4 hover:underline">
              Aplique aqui
            </Link>
          </p>
          {quote?.coupon && (
            <p className="mt-1 text-center text-caption text-text-secondary">
              Cupom {quote.coupon.code} aplicado: {quote.coupon.percent}% de desconto.
            </p>
          )}
          {quote?.couponError && <p className="mt-1 text-center text-caption text-text-coral">{quote.couponError.message}</p>}

          <div className="mt-3">
            <QuoteTotals quote={quote} slotPrefix="checkout" />
          </div>
          <p data-slot="checkout-quote-expiry" className={cn('mt-1 text-center text-caption text-text-secondary', !quote && 'invisible')}>
            {quote ? `Cotação válida até ${formatQuoteExpiry(quote)}.` : 'Cotação válida até --:--.'}
          </p>
        </div>
      )}
    </section>
  )
}
