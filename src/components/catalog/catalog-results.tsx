import type { ReactNode } from 'react'
import { AlertTriangle, Heart, SearchX } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from './nft-card'

export const gridClass =
  'grid grid-cols-2 gap-x-4 gap-y-8 max-md:pb-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 xl:gap-x-[2.125rem] xl:gap-y-[3.375rem]'
const staggerClass = 'max-md:even:translate-y-8'
const FIRST_ROW_SIZE = 3

export function CatalogGrid({ items }: { items: NftSummary[] }) {
  return (
    <ul data-slot="catalog-grid" className={gridClass}>
      {items.map((nft, index) => (
        <li key={nft.id} className={staggerClass}>
          <NftCard nft={nft} eager={index < FIRST_ROW_SIZE} />
        </li>
      ))}
    </ul>
  )
}

export function CatalogGridSkeleton({ count }: { count: number }) {
  return (
    <div data-slot="catalog-grid" className={gridClass}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={staggerClass}>
          <NftCardSkeleton />
        </div>
      ))}
    </div>
  )
}

type CatalogMessageProps = {
  tone: 'empty' | 'error' | 'favorites'
  title: string
  description: string
} & ({ actionLabel: string; onAction: () => void; action?: never } | { action: ReactNode; actionLabel?: never; onAction?: never })

const ICONS = { empty: SearchX, error: AlertTriangle, favorites: Heart }

export function CatalogMessage({ tone, title, description, actionLabel, onAction, action }: CatalogMessageProps) {
  const Icon = ICONS[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className="flex min-h-[22rem] flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-surface-card px-6 py-12 text-center md:rounded-none"
    >
      <Icon className="size-10 text-text-accent" aria-hidden="true" />
      <h3 className="text-body-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-md text-body-sm text-text-secondary">{description}</p>
      {action ?? (
        <Button onClick={onAction} className="mt-2 font-bold">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
