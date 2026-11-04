import { useRef, useState } from 'react'
import { CatalogSection } from '@/components/catalog/catalog-section'
import { Hero } from './hero'
import { JournalSection } from './journal-section'
import { MobileSearchBar } from './mobile-search-bar'
import { PromoBanners } from './promo-banners'

export function HomePage() {
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
