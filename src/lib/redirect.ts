import type { AnyRouter } from '@tanstack/react-router'

const AUTH_PATHS = ['/login', '/register']
const PRIVATE_LAYOUT_ID = '/_authenticated'

export function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return undefined
  }
  return value
}

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.includes(pathname)
}

function pathnameOf(href: string): string {
  return new URL(href, window.location.origin).pathname
}

export function isPrivatePath(router: AnyRouter, href: string): boolean {
  return router.matchRoutes(pathnameOf(href)).some((match) => match.routeId === PRIVATE_LAYOUT_ID)
}

export function loginRedirectFor(href: string): string | undefined {
  return isAuthPath(pathnameOf(href)) ? undefined : sanitizeRedirect(href)
}
