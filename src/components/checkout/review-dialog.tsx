import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { Quote } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatQuoteExpiry } from '@/lib/quote-changes'
import { QuoteChangesNotice, QuoteLineItem, QuoteTotals } from './quote-parts'
import type { SubmissionStatus } from './use-order-submission'

export interface ReviewEntry {
  label: string
  value: string
}

type ReviewDialogProps = {
  open: boolean
  quote: Quote | null
  collector: ReviewEntry[]
  payment: ReviewEntry[]
  note: string | null
  outdated: boolean
  changes: string[]
  status: SubmissionStatus
  errorMessage: string | null
  onOpenChange: (open: boolean) => void
  onAcceptQuote: () => void
  onConfirm: () => void
  onRetry: () => void
  returnFocus: () => void
}

function Entries({ entries }: { entries: ReviewEntry[] }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
      {entries.map((entry) => (
        <div key={entry.label} className="contents">
          <dt className="text-text-secondary">{entry.label}</dt>
          <dd className="mb-1 break-words text-foreground sm:mb-0">{entry.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ReviewDialog({
  open,
  quote,
  collector,
  payment,
  note,
  outdated,
  changes,
  status,
  errorMessage,
  onOpenChange,
  onAcceptQuote,
  onConfirm,
  onRetry,
  returnFocus,
}: ReviewDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const busy = status === 'sending' || status === 'verifying'
  const blocked = !quote || outdated || !quote.purchasable
  const confirmDisabled = blocked || busy || status === 'stalled'

  function acceptQuote() {
    onAcceptQuote()
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (busy && !next ? undefined : onOpenChange(next))}>
      <DialogContent
        showCloseButton={!busy}
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus()
        }}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-5 sm:max-w-[38rem] md:p-8"
      >
        <DialogTitle ref={titleRef} tabIndex={-1} className="pr-10 text-[1.1875rem] leading-7 outline-none">
          Revise sua compra
        </DialogTitle>
        <DialogDescription className="mt-1">
          Confira os dados antes de confirmar. O pedido usa exatamente os valores desta cotação.
        </DialogDescription>

        {outdated && quote && (
          <div className="mt-5">
            <QuoteChangesNotice
              title="A cotação mudou desde a sua revisão"
              messages={changes}
              description="Revise os novos valores e confirme a compra novamente."
              action={{ label: 'Revisar nova cotação', onClick: acceptQuote, disabled: busy }}
            />
          </div>
        )}

        <section aria-labelledby="review-collector" className="mt-5 text-body-sm">
          <h3 id="review-collector" className="mb-2 text-body font-bold text-foreground">
            Dados do colecionador
          </h3>
          <Entries entries={collector} />
        </section>

        <section aria-labelledby="review-payment" className="mt-5 text-body-sm">
          <h3 id="review-payment" className="mb-2 text-body font-bold text-foreground">
            Carteira e rede
          </h3>
          <Entries entries={payment} />
        </section>

        {quote && (
          <section aria-labelledby="review-items" className={cn('mt-5 transition-opacity', outdated && 'opacity-60')}>
            <h3 id="review-items" className="mb-2 text-body font-bold text-foreground">
              Itens e valores
            </h3>
            <ul aria-label="Itens do pedido" className="flex flex-col gap-3">
              {quote.lines.map((line) => (
                <QuoteLineItem key={line.cartItemId} line={line} />
              ))}
            </ul>
            <div data-slot="review-totals" className="mt-4">
              <QuoteTotals quote={quote} slotPrefix="review" />
            </div>
            <p className="mt-1 text-center text-caption text-text-secondary">
              Cotação {quote.id} (versão {quote.version}), válida até {formatQuoteExpiry(quote)}.
            </p>
          </section>
        )}

        {note && (
          <section aria-labelledby="review-note" className="mt-5 text-body-sm">
            <h3 id="review-note" className="mb-1 text-body font-bold text-foreground">
              Observação
            </h3>
            <p className="break-words whitespace-pre-line text-foreground">{note}</p>
          </section>
        )}

        {quote && !quote.purchasable && !outdated && (
          <p role="alert" className="mt-5 flex items-start gap-2 text-body-sm text-text-coral">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Há itens esgotados ou acima do disponível.{' '}
              <Link to="/cart" className="font-bold underline underline-offset-4">
                Ajustar o carrinho
              </Link>
            </span>
          </p>
        )}

        <output aria-live="polite" className="mt-5 block text-body-sm empty:hidden">
          {status === 'sending' && <p className="text-foreground">Enviando o pedido…</p>}
          {status === 'verifying' && (
            <p className="flex items-start gap-2 text-foreground">
              <Loader2 className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
              Estamos verificando o seu pedido. Não é preciso enviar de novo: a nova tentativa usa a mesma identificação e não duplica a
              compra.
            </p>
          )}
        </output>

        {status === 'stalled' && (
          <div role="alert" className="mt-3 flex flex-col items-start gap-3 rounded-sm bg-surface-raised p-4 text-body-sm">
            <p className="text-foreground">
              Ainda não conseguimos confirmar o recebimento do pedido. Os itens continuam no carrinho e nada foi cobrado em duplicidade.
            </p>
            <Button size="sm" onClick={onRetry} className="font-bold">
              Verificar novamente
            </Button>
          </div>
        )}

        {errorMessage && status === 'idle' && (
          <p role="alert" className="mt-3 flex items-start gap-2 text-body-sm text-text-coral">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={busy} className="h-11 font-bold">
              Editar dados
            </Button>
          </DialogClose>
          <Button
            type="button"
            aria-disabled={confirmDisabled || undefined}
            aria-busy={busy || undefined}
            onClick={() => {
              if (!confirmDisabled) {
                onConfirm()
              }
            }}
            className={cn('h-11 font-bold', confirmDisabled && 'cursor-not-allowed opacity-60')}
          >
            {busy ? 'Enviando pedido…' : 'Confirmar e enviar pedido'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
