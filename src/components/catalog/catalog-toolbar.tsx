import { NFT_SORTS, type NftSegment, type NftSort } from '@/api/contracts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const SEGMENTS: Array<{ id: NftSegment; label: string }> = [
  { id: 'all', label: 'Todos os NFTs' },
  { id: 'new', label: 'Novos lançamentos' },
  { id: 'trending', label: 'Em alta' },
]

const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  'name-asc': 'Nome (A–Z)',
  'rating-desc': 'Mais bem avaliados',
}

type SegmentTabsProps = {
  segment: NftSegment
  onChange: (segment: NftSegment) => void
}

export function SegmentTabs({ segment, onChange }: SegmentTabsProps) {
  return (
    <fieldset className="-mx-1 flex min-w-0 gap-x-3 overflow-x-auto px-1 md:gap-x-5">
      <legend className="sr-only">Segmento</legend>
      {SEGMENTS.map((option) => {
        const active = option.id === segment
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'relative shrink-0 py-1 text-body leading-6 whitespace-nowrap transition-colors hover:text-text-accent md:text-body-sm md:font-bold',
              active
                ? 'font-bold text-text-accent after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary'
                : 'text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </fieldset>
  )
}

type SortSelectProps = {
  sort: NftSort
  onChange: (sort: NftSort) => void
}

export function SortSelect({ sort, onChange }: SortSelectProps) {
  return (
    <div className="flex items-center">
      <span id="catalog-sort-label" className="text-body-sm text-foreground">
        Ordenar por:
      </span>
      <Select value={sort} onValueChange={(value) => onChange(value as NftSort)}>
        <SelectTrigger
          aria-labelledby="catalog-sort-label catalog-sort-value"
          className="h-8 border-0 px-1 text-body-sm text-foreground"
        >
          <span id="catalog-sort-value">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {NFT_SORTS.map((option) => (
            <SelectItem key={option} value={option}>
              {SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
