import { createRouter } from '@tanstack/react-router'
import { queryClient } from '@/lib/query-client'
import { parseSearch, stringifySearch } from '@/lib/search-serialization'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }

  interface StaticDataRouteOption {
    hideMobileTabBar?: boolean
    mobileActionBar?: boolean
  }
}
