import { useRouterState } from '@tanstack/react-router'

export const CATALOG_HASH = 'catalogo'

export type Section = 'home' | 'market' | 'cart' | 'profile'

const MARKET_PREFIXES = ['/nfts/', '/cart', '/checkout', '/orders/']
const PROFILE_PREFIXES = ['/profile', '/wallets']

export function useActiveSection(): Section | null {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hash = useRouterState({ select: (state) => state.location.hash })

  if (pathname === '/') {
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
