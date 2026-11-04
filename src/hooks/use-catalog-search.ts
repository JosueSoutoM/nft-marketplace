import { useCallback } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import type { CatalogSearch } from '@/lib/catalog-search'

const homeRoute = getRouteApi('/')

export function useCatalogSearch(): CatalogSearch {
  return homeRoute.useSearch()
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
