import { useRef, useState } from 'react'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { CatalogSection } from '@/components/catalog/catalog-section'
import { MobileSearchBar } from '@/components/home/mobile-search-bar'
import { Hero } from '@/components/home/hero'
import { JournalSection } from '@/components/home/journal-section'
import { PromoBanners } from '@/components/home/promo-banners'
import { CATALOG_SEARCH_DEFAULTS, validateCatalogSearch } from '@/lib/catalog-search'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  search: {
    middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)],
  },
  component: HomePage,
})

function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersReturnFocusRef = useRef<HTMLElement | null>(null)

  function openFilters(trigger: HTMLElement) {
    filtersReturnFocusRef.current = trigger
    setFiltersOpen(true)
  }

  return (
    <>
      <MobileSearchBar onOpenFilters={openFilters} />
      <Hero />
      <CatalogSection
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        filtersReturnFocusRef={filtersReturnFocusRef}
      />
      <PromoBanners />
      <JournalSection />
    </>
  )
}
