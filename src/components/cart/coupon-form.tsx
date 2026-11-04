import { useId, useRef, useState, type FormEvent } from 'react'
import { TicketPercent, X } from 'lucide-react'
import type { Cart, Quote } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { useApplyCoupon, useRemoveCoupon } from '@/hooks/use-cart'
import { announce } from '@/lib/announcer'
import { cn } from '@/lib/utils'

function couponErrorMessage(error: Error): string {
  return isApiError(error) ? (error.fieldErrors.code ?? error.message) : error.message
}

type CouponFormProps = {
  cart: Cart
  quote: Quote | undefined
}

export function CouponForm({ cart, quote }: CouponFormProps) {
  const inputId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon((_cart, applied) => {
    setCode('')
    announce(`Cupom ${applied.trim().toUpperCase()} aplicado. O resumo foi atualizado.`)
  })
  const remove = useRemoveCoupon(() => announce(`Cupom ${cart.couponCode ?? ''} removido. O resumo foi atualizado.`))
  const busy = apply.isPending || remove.isPending
  const appliedCoupon = quote?.coupon?.code === cart.couponCode ? quote?.coupon : null
  const couponProblem = quote?.couponError && quote.couponError.code === cart.couponCode ? quote.couponError.message : null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) {
      return
    }
    const value = code.trim()
    if (!value) {
      setError('Informe o código promocional.')
      inputRef.current?.focus()
      return
    }
    setError(null)
    apply.mutate(value, {
      onError: (failure) => {
        setError(couponErrorMessage(failure))
        inputRef.current?.focus()
      },
    })
  }

  return (
    <div>
      <form noValidate onSubmit={submit}>
        <label htmlFor={inputId} className="mb-2.5 block text-body-sm font-bold text-foreground max-md:sr-only">
          Código promocional
        </label>
        <div
          className={cn(
            'flex h-14 items-stretch overflow-hidden rounded-full border border-border-soft bg-ink/40 md:h-[2.875rem] md:rounded-none md:border-primary md:bg-transparent',
            error && 'border-text-coral md:border-text-coral',
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setError(null)
            }}
            placeholder="Digite o código promocional..."
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1 bg-transparent px-4 text-caption text-foreground placeholder:text-secondary focus-visible:outline-none md:px-2.5"
          />
          <button
            type="submit"
            aria-disabled={busy || undefined}
            className="shrink-0 rounded-full bg-linear-to-r from-primary-light to-primary-dark px-5 text-body-lg font-bold text-primary-foreground aria-disabled:opacity-60 md:rounded-none md:bg-none md:bg-primary md:px-[1.125rem] md:text-body"
          >
            Aplicar
          </button>
        </div>
        {error && (
          <p id={errorId} role="alert" data-slot="coupon-error" className="mt-2 text-caption text-text-coral">
            {error}
          </p>
        )}
      </form>

      {cart.couponCode && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-md bg-surface-raised px-3 py-2 text-body-sm">
          <p className="flex min-w-0 items-start gap-2 text-foreground">
            <TicketPercent className="mt-0.5 size-4 shrink-0 text-text-accent" aria-hidden="true" />
            <span>
              Cupom <strong>{cart.couponCode}</strong>
              {appliedCoupon ? ` aplicado: ${appliedCoupon.percent}% de desconto.` : couponProblem ? ' sem efeito.' : ' aplicado.'}
              {couponProblem && (
                <span data-slot="coupon-problem" className="block text-text-coral">
                  {couponProblem}
                </span>
              )}
            </span>
          </p>
          <button
            type="button"
            aria-disabled={busy || undefined}
            onClick={() => {
              if (!busy) {
                setError(null)
                remove.mutate()
              }
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm text-text-accent hover:underline aria-disabled:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
            Remover cupom
          </button>
        </div>
      )}
    </div>
  )
}
