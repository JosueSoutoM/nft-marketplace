import { SlidersHorizontal } from 'lucide-react'
import { CatalogSearchField } from '@/components/catalog/catalog-search-field'
import { Container } from '@/components/layout/container'

type MobileSearchBarProps = {
  onOpenFilters: (trigger: HTMLElement) => void
}

export function MobileSearchBar({ onOpenFilters }: MobileSearchBarProps) {
  return (
    <Container className="flex gap-2 pt-10 md:hidden">
      <CatalogSearchField
        id="mobile-search"
        label="Buscar NFTs por nome, criador ou coleção"
        placeholder="Explorar coleções"
        className="flex-1"
        inputClassName="h-[2.8125rem]"
      />
      <button
        type="button"
        aria-label="Abrir filtros"
        aria-haspopup="dialog"
        onClick={(event) => onOpenFilters(event.currentTarget)}
        className="flex size-[2.8125rem] shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-primary-light to-primary-dark text-ink"
      >
        <SlidersHorizontal className="size-5" aria-hidden="true" />
      </button>
    </Container>
  )
}
