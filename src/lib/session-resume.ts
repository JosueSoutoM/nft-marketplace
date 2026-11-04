const DRAFT_PREFIX = 'kurio.resume.'

interface StoredDraft<T> {
  userId: string
  savedAt: string
  data: T
}

type SessionEndHandler = () => void

const sessionEndHandlers = new Set<SessionEndHandler>()

export function onSessionInterrupted(handler: SessionEndHandler): () => void {
  sessionEndHandlers.add(handler)
  return () => {
    sessionEndHandlers.delete(handler)
  }
}

export function notifySessionInterrupted(): void {
  sessionEndHandlers.forEach((handler) => handler())
}

export function saveResumeDraft<T>(key: string, userId: string, data: T): void {
  const draft: StoredDraft<T> = { userId, savedAt: new Date().toISOString(), data }
  sessionStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(draft))
}

export function readResumeDraft<T>(key: string, userId: string): T | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(`${DRAFT_PREFIX}${key}`) ?? 'null') as StoredDraft<T> | null
    return draft && draft.userId === userId ? draft.data : null
  } catch {
    return null
  }
}

export function clearResumeDraft(key: string): void {
  sessionStorage.removeItem(`${DRAFT_PREFIX}${key}`)
}

function draftOwner(storageKey: string): string | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as StoredDraft<unknown> | null
    return draft?.userId ?? null
  } catch {
    return null
  }
}

export function clearResumeDrafts(exceptUserId: string | null = null): void {
  for (const storageKey of Object.keys(sessionStorage)) {
    if (!storageKey.startsWith(DRAFT_PREFIX)) {
      continue
    }
    if (!exceptUserId || draftOwner(storageKey) !== exceptUserId) {
      sessionStorage.removeItem(storageKey)
    }
  }
}
