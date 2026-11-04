import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { CartItem } from '@/api/contracts'
import { announce } from '@/lib/announcer'
import { cartItemLimitReason } from '@/lib/cart-changes'
import { cn } from '@/lib/utils'

const stepClass =
  'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-foreground transition-colors hover:text-text-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-40 md:h-7 md:w-5 md:rounded-full md:bg-primary md:text-primary-foreground md:hover:bg-primary-light md:hover:text-primary-foreground'

type CartQuantityProps = {
  item: CartItem
  busy: boolean
  onChange: (quantity: number) => void
  className?: string
}

export function CartQuantity({ item, busy, onChange, className }: CartQuantityProps) {
  const inputId = useId()
  const hintId = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const max = item.maxQuantity
  const reason = cartItemLimitReason(item)
  const atMin = item.quantity <= 1
  const atMax = item.quantity >= max
  const label = `${item.name}, edição ${item.editionLabel}`

  function request(next: number) {
    if (busy || next === item.quantity) {
      return
    }
    onChange(next)
  }

  function decrement() {
    if (busy || atMin) {
      return
    }
    request(Math.max(1, Math.min(item.quantity - 1, max)))
  }

  function increment() {
    if (busy) {
      return
    }
    if (atMax) {
      announce(reason)
      return
    }
    request(item.quantity + 1)
  }

  function commitDraft() {
    if (draft === null) {
      return
    }
    setDraft(null)
    const typed = Number(draft)
    if (draft === '' || !Number.isSafeInteger(typed) || typed < 1 || max === 0) {
      return
    }
    const clamped = Math.min(typed, max)
    if (clamped !== typed) {
      announce(`Quantidade ajustada para ${clamped}. ${reason}`)
    }
    request(clamped)
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    setDraft(event.target.value.replace(/\D/g, '').slice(0, 4))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitDraft()
    }
    if (event.key === 'Escape') {
      setDraft(null)
    }
  }

  return (
    <div className={cn('flex flex-col items-end gap-1 md:items-start', className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Diminuir quantidade de ${label}`}
          aria-controls={inputId}
          aria-disabled={busy || atMin}
          onClick={decrement}
          className={stepClass}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={`Quantidade de ${label}`}
          aria-describedby={atMax ? hintId : undefined}
          readOnly={busy}
          value={draft ?? String(item.quantity)}
          onChange={handleInput}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          className="h-8 w-9 rounded-md bg-transparent text-center text-body-lg text-foreground md:w-8"
        />
        <button
          type="button"
          aria-label={`Aumentar quantidade de ${label}`}
          aria-controls={inputId}
          aria-disabled={busy || atMax}
          aria-describedby={atMax ? hintId : undefined}
          onClick={increment}
          className={stepClass}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {atMax && (
        <p id={hintId} data-slot="cart-quantity-limit" className="max-w-[9rem] text-right text-caption text-text-secondary md:text-left">
          {reason}
        </p>
      )}
    </div>
  )
}
