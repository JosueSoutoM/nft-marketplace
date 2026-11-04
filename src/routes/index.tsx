import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { HomePage } from '@/components/home/home-page'
import { CATALOG_SEARCH_DEFAULTS, validateCatalogSearch } from '@/lib/catalog-search'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  search: {
    middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)],
  },
  component: HomePage,
})
