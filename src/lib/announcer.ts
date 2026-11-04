export interface Announcement {
  id: number
  message: string
}

const listeners = new Set<() => void>()
let current: Announcement = { id: 0, message: '' }

export function announce(message: string): void {
  current = { id: current.id + 1, message }
  listeners.forEach((listener) => listener())
}

export function getAnnouncement(): Announcement {
  return current
}

export function subscribeAnnouncements(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
