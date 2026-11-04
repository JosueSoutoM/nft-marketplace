import { useCallback } from 'react'
import { useMatch, useNavigate } from '@tanstack/react-router'
import { CATALOG_SEARCH_DEFAULTS, type CatalogSearch } from '@/lib/catalog-search'

const BACKDROP_SEARCH: CatalogSearch = { ...CATALOG_SEARCH_DEFAULTS, category: [], network: [] }

export function useCatalogSearch(): CatalogSearch {
  const homeMatch = useMatch({ from: '/', shouldThrow: false })
  return homeMatch?.search ?? BACKDROP_SEARCH
}

type CatalogSearchPatch = Partial<Omit<CatalogSearch, 'page'>>

interface UpdateOptions {
  replace?: boolean
}

export function useUpdateCatalogSearch() {
  const navigate = useNavigate()

  const updateFilters = useCallback(
    (patch: CatalogSearchPatch, { replace = false }: UpdateOptions = {}) =>
      navigate({
        to: '/',
        search: (previous) => ({ ...previous, ...patch, page: 1 }),
        replace,
        resetScroll: false,
      }),
    [navigate],
  )

  const goToPage = useCallback(
    (page: number) =>
      navigate({
        to: '/',
        search: (previous) => ({ ...previous, page }),
        resetScroll: false,
      }),
    [navigate],
  )

  return { updateFilters, goToPage }
}
