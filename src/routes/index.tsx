import { createFileRoute, redirect, stripSearchParams } from '@tanstack/react-router'
import { getSessionSnapshot } from '@/api/session-token'
import { HomePage } from '@/components/home/home-page'
import { CATALOG_SEARCH_DEFAULTS, validateCatalogSearch } from '@/lib/catalog-search'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  search: {
    middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)],
  },
  beforeLoad: ({ search, location }) => {
    if (search.favorites && !getSessionSnapshot().session) {
      throw redirect({ to: '/login', search: { redirect: location.href }, replace: true })
    }
  },
  component: HomePage,
})
