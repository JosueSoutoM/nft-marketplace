const SESSION_STORAGE_KEY = 'kurio.session'

export interface StoredSession {
  token: string
  userId: string
}

export type SessionEndReason = 'logout' | 'expired' | 'invalid'

export interface SessionSnapshot {
  session: StoredSession | null
  endReason: SessionEndReason | null
}

const listeners = new Set<() => void>()
let snapshot: SessionSnapshot = { session: readStoredSession(), endReason: null }

function readStoredSession(): StoredSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as Partial<StoredSession> | null
    return parsed && typeof parsed.token === 'string' && typeof parsed.userId === 'string'
      ? { token: parsed.token, userId: parsed.userId }
      : null
  } catch {
    return null
  }
}

function update(next: SessionSnapshot): void {
  snapshot = next
  listeners.forEach((listener) => listener())
}

window.addEventListener('storage', (event) => {
  if (event.key !== SESSION_STORAGE_KEY && event.key !== null) {
    return
  }
  const session = readStoredSession()
  if (session?.token !== snapshot.session?.token) {
    update({ session, endReason: session ? null : 'logout' })
  }
})

export function getSessionSnapshot(): SessionSnapshot {
  return snapshot
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSessionToken(): string | null {
  return snapshot.session?.token ?? null
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  update({ session, endReason: null })
}

export function endSession(reason: SessionEndReason): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  if (snapshot.session) {
    update({ session: null, endReason: reason })
  }
}
