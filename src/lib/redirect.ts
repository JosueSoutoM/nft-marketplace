const AUTH_PATHS = ['/login', '/register']

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
