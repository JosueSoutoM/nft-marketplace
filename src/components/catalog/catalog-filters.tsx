import { NETWORK_IDS, NFT_CATEGORY_IDS, type EthAmount, type NftFacetOption, type NftFacets } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { hasActiveFilters, toggleValue, type CatalogSearch } from '@/lib/catalog-search'
import { cn } from '@/lib/utils'
import { PriceRangeFilter } from './price-range-filter'

type FilterPatch = Partial<Omit<CatalogSearch, 'page'>>

type CatalogFiltersProps = {
  idPrefix: string
  search: CatalogSearch
  facets?: NftFacets
  onChange: (patch: FilterPatch) => void
  onClear: () => void
  className?: string
}

export function CatalogFilters({ idPrefix, search, facets, onChange, onClear, className }: CatalogFiltersProps) {
  return (
    <div className={cn('bg-surface-card px-6 py-6', className)}>
      <FacetGroup
        id={`${idPrefix}-categories`}
        title="Coleções"
        options={facets?.categories}
        selected={search.category}
        countClassName="font-bold"
        skeletonRows={NFT_CATEGORY_IDS.length}
        onToggle={(id) => onChange({ category: toggleValue(search.category, id) })}
      />

      <section aria-labelledby={`${idPrefix}-price`} className="mt-10">
        <h3 id={`${idPrefix}-price`} className="text-body-lg font-bold text-foreground">
          Faixa de preço
        </h3>
        {facets ? (
          <PriceRangeFilter
            range={facets.priceRange}
            priceMin={search.priceMin}
            priceMax={search.priceMax}
            onApply={(priceMin: EthAmount | undefined, priceMax: EthAmount | undefined) =>
              onChange({ priceMin, priceMax })
            }
          />
        ) : (
          <div aria-hidden="true">
            <Skeleton className="mt-3 h-5 w-full" />
            <Skeleton className="mt-3 ml-4 h-6 w-44" />
            <Skeleton className="mt-2.5 ml-4 h-7 w-20" />
          </div>
        )}
      </section>

      <FacetGroup
        id={`${idPrefix}-networks`}
        title="Rede"
        options={facets?.networks}
        selected={search.network}
        className="mt-10"
        skeletonRows={NETWORK_IDS.length}
        onToggle={(id) => onChange({ network: toggleValue(search.network, id) })}
      />

      {hasActiveFilters(search) && (
        <button
          type="button"
          onClick={onClear}
          className="mt-8 text-body-sm font-bold text-text-accent underline-offset-4 hover:underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}

type FacetGroupProps<T extends string> = {
  id: string
  title: string
  options?: NftFacetOption<T>[]
  selected: T[]
  onToggle: (id: T) => void
  className?: string
  countClassName?: string
  skeletonRows: number
}

function FacetGroup<T extends string>({
  id,
  title,
  options,
  selected,
  onToggle,
  className,
  countClassName,
  skeletonRows,
}: FacetGroupProps<T>) {
  return (
    <section aria-labelledby={id} className={className}>
      <h3 id={id} className="text-body-lg font-bold text-foreground">
        {title}
      </h3>
      <ul className="mt-2">
        {options
          ? options.map((option) => {
              const active = selected.includes(option.id)
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(option.id)}
                    className={cn(
                      'flex h-10 w-full items-center justify-between rounded-sm pl-4 text-left text-body-sm transition-colors hover:text-text-accent',
                      active ? 'font-bold text-text-accent' : 'text-text-secondary',
                    )}
                  >
                    <span>{option.label}</span>
                    <span className={cn(countClassName, !active && 'text-text-secondary')}>
                      <span className="sr-only">, </span>({option.count})
                      <span className="sr-only"> resultados</span>
                    </span>
                  </button>
                </li>
              )
            })
          : Array.from({ length: skeletonRows }, (_, index) => (
              <li key={index} aria-hidden="true" className="flex h-10 items-center justify-between pl-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-8" />
              </li>
            ))}
      </ul>
    </section>
  )
}
