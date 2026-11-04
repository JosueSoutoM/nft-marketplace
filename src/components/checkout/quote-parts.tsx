import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { Quote, QuoteLine } from '@/api/contracts'
import { summaryRowClass, summaryValueClass } from '@/components/cart/layout'
import { NftImage } from '@/components/nft/nft-image'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

function lineIssueText(line: QuoteLine): { text: string; blocking: boolean } | null {
  if (line.issue === 'SOLD_OUT') {
    return { text: 'Edição esgotada.', blocking: true }
  }
  if (line.issue === 'INSUFFICIENT_AVAILABILITY') {
    return { text: `Disponível: ${line.available} ${line.available === 1 ? 'unidade' : 'unidades'}.`, blocking: true }
  }
  if (line.issue === 'NOT_FOUND') {
    return { text: 'Item indisponível.', blocking: true }
  }
  if (line.issue === 'PRICE_CHANGED' && line.previousUnitPrice) {
    return { text: `Preço alterado de ${formatEth(line.previousUnitPrice)} para ${formatEth(line.unitPrice)}.`, blocking: false }
  }
  return null
}

export function QuoteLineItem({ line }: { line: QuoteLine }) {
  const issue = lineIssueText(line)
  return (
    <li
      data-slot="checkout-line"
      aria-label={`${line.name}, edição ${line.editionLabel}`}
      className="grid min-h-[4.375rem] grid-cols-[4.375rem_minmax(0,1fr)] items-center gap-x-3 bg-surface-card pr-3 sm:grid-cols-[4.375rem_minmax(0,1fr)_auto]"
    >
      <NftImage
        image={line.image}
        alt=""
        sizes="70px"
        className="size-[4.375rem] self-start object-cover max-sm:row-span-2 sm:self-center"
      />
      <div className="min-w-0 pt-2 sm:py-2">
        <p className="truncate text-body font-bold text-foreground">{line.name}</p>
        <p className="truncate text-body-sm leading-5 text-text-secondary">ID do token: #{line.tokenId}</p>
        <p className="text-caption text-text-secondary">Edição {line.editionLabel}</p>
        {issue && (
          <p data-slot="checkout-line-issue" className={cn('text-caption', issue.blocking ? 'text-text-coral' : 'text-text-accent')}>
            {issue.text}
          </p>
        )}
      </div>
      <p className="flex h-8 items-center gap-2 pb-2 whitespace-nowrap max-sm:col-start-2 sm:h-6 sm:pb-0 sm:text-right">
        <span className="text-body-sm text-text-secondary">
          <span aria-hidden="true">(x {line.quantity})</span>
          <span className="sr-only">{line.quantity === 1 ? '1 unidade' : `${line.quantity} unidades`}, total</span>
        </span>
        <span className="text-body-lg font-bold text-text-accent tabular-nums">{formatEth(line.lineTotal)}</span>
      </p>
    </li>
  )
}

export function QuoteLinesSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: Math.max(rows, 1) }, (_, index) => (
        <div
          key={index}
          data-slot="checkout-line-skeleton"
          className="grid min-h-[4.375rem] grid-cols-[4.375rem_minmax(0,1fr)] items-center gap-x-3 bg-surface-card pr-3 sm:grid-cols-[4.375rem_minmax(0,1fr)_auto]"
        >
          <Skeleton className="size-[4.375rem] self-start rounded-none max-sm:row-span-2 sm:self-center" />
          <div className="flex min-w-0 flex-col pt-2 sm:py-2">
            <span className="flex h-[1.375rem] items-center">
              <Skeleton className="h-4 w-3/4" />
            </span>
            <span className="flex h-5 items-center">
              <Skeleton className="h-3.5 w-1/2" />
            </span>
            <span className="flex h-4 items-center">
              <Skeleton className="h-3 w-1/3" />
            </span>
          </div>
          <span className="flex h-8 items-center pb-2 max-sm:col-start-2 sm:h-6 sm:pb-0">
            <Skeleton className="h-5 w-24" />
          </span>
        </div>
      ))}
    </div>
  )
}

type QuoteTotalsProps = {
  quote: Quote | undefined
  loading?: boolean
  slotPrefix: string
}

export function QuoteTotals({ quote, loading = false, slotPrefix }: QuoteTotalsProps) {
  const value = (render: (data: Quote) => string, width: string) =>
    quote && !loading ? render(quote) : <Skeleton className={cn('ml-auto h-5', width)} />

  return (
    <dl className="flex flex-col">
      <div className={summaryRowClass}>
        <dt>Subtotal</dt>
        <dd data-slot={`${slotPrefix}-subtotal`} className={cn(summaryValueClass, 'flex min-h-8 items-center')}>
          {value((data) => formatEth(data.subtotal), 'w-24')}
        </dd>
      </div>
      <div className={summaryRowClass}>
        <dt>{quote?.coupon?.label ?? 'Desconto do lançamento'}</dt>
        <dd data-slot={`${slotPrefix}-discount`} className={cn(summaryValueClass, 'flex min-h-8 items-center text-[0.9375rem]')}>
          {value((data) => `(-) ${formatEth(data.discount)}`, 'w-20')}
        </dd>
      </div>
      <div className={summaryRowClass}>
        <dt>Taxa de rede</dt>
        <dd className="flex flex-col items-end">
          <span data-slot={`${slotPrefix}-fee`} className={cn(summaryValueClass, 'flex min-h-8 items-center')}>
            {value((data) => formatEth(data.networkFee), 'w-20')}
          </span>
          <span className={cn('text-caption text-text-accent', quote && !quote.networkFeeEstimated && 'invisible')}>Taxa estimada</span>
        </dd>
      </div>
      <div className="mt-3 flex min-h-8 items-center justify-between gap-3 border-t border-border-soft pt-3 lg:px-12">
        <dt className="text-body-lg font-bold text-foreground">Total</dt>
        <dd data-slot={`${slotPrefix}-total`} className="text-right text-[1.25rem] leading-8 font-bold text-text-accent tabular-nums">
          {value((data) => formatEth(data.total), 'w-28')}
        </dd>
      </div>
    </dl>
  )
}

type QuoteChangesNoticeProps = {
  messages: string[]
  title: string
  description: ReactNode
  action?: { label: string; onClick: () => void; disabled?: boolean }
}

export function QuoteChangesNotice({ messages, title, description, action }: QuoteChangesNoticeProps) {
  return (
    <div role="alert" data-slot="quote-changes" className="rounded-sm border border-text-accent bg-surface-raised p-4 text-body-sm">
      <p className="flex items-start gap-2 font-bold text-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-text-accent" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-6 text-foreground">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
      <p className="mt-2 text-text-secondary">{description}</p>
      {action && (
        <Button
          type="button"
          size="sm"
          onClick={action.onClick}
          aria-disabled={action.disabled || undefined}
          className={cn('mt-3 h-9 px-4 font-bold', action.disabled && 'cursor-not-allowed opacity-60')}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {action.label}
        </Button>
      )}
    </div>
  )
}
