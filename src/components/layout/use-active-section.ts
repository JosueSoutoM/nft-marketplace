import { useRouterState } from '@tanstack/react-router'
import { isAuthPath } from '@/lib/redirect'

export const CATALOG_HASH = 'catalogo'

export type Section = 'home' | 'market' | 'favorites' | 'cart' | 'profile'

const MARKET_PREFIXES = ['/nfts/', '/cart', '/checkout', '/orders/']
const PROFILE_PREFIXES = ['/profile', '/wallets']

function isFavoritesSearch(search: object): boolean {
  return 'favorites' in search && search.favorites === true
}

export function useActiveSection(): Section | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hash = useRouterState({ select: (state) => state.location.hash })
  const favorites = useRouterState({ select: (state) => isFavoritesSearch(state.location.search) })

  if (pathname === '/' && favorites) {
    return 'favorites'
  }
  if (pathname === '/' || isAuthPath(pathname)) {
    return hash === CATALOG_HASH ? 'market' : 'home'
  }
  if (pathname === '/cart') {
    return 'cart'
  }
  if (MARKET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return 'market'
  }
  if (PROFILE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return 'profile'
  }
  return null
}
