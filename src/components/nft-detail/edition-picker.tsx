import { useId } from 'react'
import type { NftEdition } from '@/api/contracts'
import { isSoldOut } from '@/lib/nft-edition'
import { cn } from '@/lib/utils'

type EditionPickerProps = {
  editions: NftEdition[]
  selectedId: string
  onSelect: (editionId: string) => void
}

export function EditionPicker({ editions, selectedId, onSelect }: EditionPickerProps) {
  const name = useId()
  const reasonId = useId()
  const soldOut = editions.filter(isSoldOut)

  return (
    <fieldset className="mt-4 md:mt-3">
      <legend className="text-[0.9375rem] leading-6 font-bold text-foreground">Edição:</legend>
      <div className="mt-2 flex flex-wrap gap-3 md:gap-2">
        {editions.map((edition) => {
          const unavailable = isSoldOut(edition)
          const checked = edition.id === selectedId
          return (
            <label key={edition.id} className="relative">
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={checked}
                disabled={unavailable}
                aria-describedby={unavailable ? reasonId : undefined}
                onChange={() => onSelect(edition.id)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex h-7 items-center rounded-full border px-2 text-body-sm uppercase transition-colors md:h-[1.6875rem] md:text-[0.8125rem]',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  checked ? 'border-primary font-bold text-text-accent' : 'border-border-soft text-text-secondary',
                  unavailable ? 'cursor-not-allowed line-through opacity-60' : 'cursor-pointer hover:border-primary',
                )}
              >
                {edition.label}
                {unavailable && <span className="sr-only">, esgotada</span>}
              </span>
            </label>
          )
        })}
      </div>
      {soldOut.length > 0 && (
        <p id={reasonId} className="mt-2 text-caption text-text-secondary">
          {soldOut.length === editions.length
            ? 'Todas as edições estão esgotadas.'
            : `${soldOut.length === 1 ? 'Esgotada' : 'Esgotadas'}: ${soldOut.map((edition) => edition.label).join(', ')}.`}
        </p>
      )}
    </fieldset>
  )
}
