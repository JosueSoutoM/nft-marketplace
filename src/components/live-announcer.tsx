import { useSyncExternalStore } from 'react'
import { getAnnouncement, subscribeAnnouncements } from '@/lib/announcer'

export function LiveAnnouncer() {
  const announcement = useSyncExternalStore(subscribeAnnouncements, getAnnouncement)

  return (
    <div data-live-announcer aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement.message && <span key={announcement.id}>{announcement.message}</span>}
    </div>
  )
}
