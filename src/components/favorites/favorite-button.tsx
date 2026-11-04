import { Heart } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { useFavoriteToggle } from '@/hooks/use-favorites'
import { cn } from '@/lib/utils'

type FavoriteButtonVariant = 'card' | 'icon' | 'labeled'

type FavoriteButtonProps = {
  nft: NftSummary
  variant: FavoriteButtonVariant
  className?: string
}

const variantClass: Record<FavoriteButtonVariant, string> = {
  card: "relative flex size-7 items-center justify-center rounded-full bg-ink/90 text-text-accent transition-colors before:absolute before:-inset-2 before:content-[''] hover:bg-ink",
  icon: 'flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-accent transition-colors hover:text-primary-light',
  labeled:
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm border border-primary px-2.5 text-body-sm text-text-accent transition-colors hover:bg-surface-raised aria-pressed:bg-surface-raised',
}

const iconClass: Record<FavoriteButtonVariant, string> = {
  card: 'size-4',
  icon: 'size-5',
  labeled: 'size-5',
}

export function FavoriteButton({ nft, variant, className }: FavoriteButtonProps) {
  const { isFavorite, unavailable, toggle } = useFavoriteToggle(nft)
  const name = isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-disabled={unavailable || undefined}
      aria-label={variant === 'labeled' ? undefined : name}
      data-slot="favorite-button"
      onClick={() => {
        if (!unavailable) {
          toggle()
        }
      }}
      className={cn(variantClass[variant], 'aria-disabled:cursor-progress aria-disabled:opacity-60', className)}
    >
      <Heart className={iconClass[variant]} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
      {variant === 'labeled' &&
        (isFavorite ? (
          <>
            <span>Remover</span>
            <span className="sr-only"> {nft.name} dos favoritos</span>
          </>
        ) : (
          <>
            <span>Favoritar</span>
            <span className="sr-only"> {nft.name}</span>
          </>
        ))}
    </button>
  )
}
