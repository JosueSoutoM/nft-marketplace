import { useId, useState, type ChangeEvent } from 'react'
import { Minus, Plus } from 'lucide-react'
import { announce } from '@/lib/announcer'
import { cn } from '@/lib/utils'

type QuantityStepperProps = {
  quantity: number
  max: number
  limitReason: string
  onChange: (quantity: number) => void
  showLabel?: boolean
  className?: string
}

const stepButtonClass =
  'flex h-10 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-light aria-disabled:cursor-not-allowed aria-disabled:opacity-50 md:h-12 md:w-8'

export function QuantityStepper({ quantity, max, limitReason, onChange, showLabel = false, className }: QuantityStepperProps) {
  const inputId = useId()
  const hintId = useId()
  const [draft, setDraft] = useState<{ text: string; quantity: number } | null>(null)
  const unavailable = max === 0
  const atMin = unavailable || quantity <= 1
  const atMax = unavailable || quantity >= max
  const showHint = unavailable || quantity >= max

  function commit(next: number) {
    const clamped = Math.min(Math.max(1, next), max)
    onChange(clamped)
    if (next >= max) {
      announce(`Quantidade ${clamped}. ${limitReason}`)
    }
  }

  function decrement() {
    if (!atMin) {
      onChange(quantity - 1)
    }
  }

  function increment() {
    if (atMax) {
      announce(limitReason)
      return
    }
    commit(quantity + 1)
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
    const value = Number(digits)
    if (digits === '' || value < 1) {
      setDraft({ text: digits, quantity })
      return
    }
    setDraft(null)
    commit(value)
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-3">
        <label htmlFor={inputId} className={showLabel ? 'text-body font-bold text-foreground' : 'sr-only'}>
          {showLabel ? 'Qtd.' : 'Quantidade'}
        </label>
        <button
          type="button"
          aria-label="Diminuir quantidade"
          aria-controls={inputId}
          aria-disabled={atMin}
          onClick={decrement}
          className={stepButtonClass}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={showLabel ? 'Quantidade' : undefined}
          aria-describedby={showHint ? hintId : undefined}
          disabled={unavailable}
          value={draft && draft.quantity === quantity ? draft.text : String(quantity)}
          onChange={handleInput}
          onBlur={() => setDraft(null)}
          className="h-10 w-10 rounded-md bg-transparent text-center text-body-lg text-foreground disabled:opacity-50"
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          aria-controls={inputId}
          aria-disabled={atMax}
          aria-describedby={showHint ? hintId : undefined}
          onClick={increment}
          className={stepButtonClass}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
      {showHint && (
        <p id={hintId} data-slot="quantity-limit" className="mt-2 text-caption text-text-coral">
          {limitReason}
        </p>
      )}
    </div>
  )
}
