import { useEffect, useState } from 'react'
import type { Quote, QuoteChange } from '@/api/contracts'
import { diffQuotes } from '@/lib/quote-changes'

interface ServerChanges {
  quoteId: string
  changes: QuoteChange[]
}

function useExpiry(expiresAt: string | undefined): boolean {
  const [expiredAt, setExpiredAt] = useState<string | null>(null)
  useEffect(() => {
    if (!expiresAt) {
      return
    }
    const timer = setTimeout(() => setExpiredAt(expiresAt), Math.max(0, Date.parse(expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [expiresAt])
  return !!expiresAt && expiredAt === expiresAt
}

export function useAcceptedQuote(current: Quote | undefined, reviewing: boolean, onExpired: () => void) {
  const [accepted, setAccepted] = useState<Quote | null>(null)
  const [serverChanges, setServerChanges] = useState<ServerChanges | null>(null)
  const expired = useExpiry(accepted?.expiresAt)

  const networkChanged = !!current && (!accepted || accepted.network !== current.network)
  const equivalent =
    !!current &&
    !!accepted &&
    current.id !== accepted.id &&
    current.version === accepted.version &&
    !(reviewing && expired) &&
    serverChanges?.quoteId !== current.id
  if (current && (networkChanged || equivalent)) {
    setAccepted(current)
    if (networkChanged) {
      setServerChanges(null)
    }
  }

  useEffect(() => {
    if (expired) {
      onExpired()
    }
  }, [expired, onExpired])

  const outdated = !!accepted && !!current && (accepted.id !== current.id || expired)

  function changes(): QuoteChange[] {
    if (!accepted || !current) {
      return []
    }
    if (serverChanges && serverChanges.quoteId === current.id) {
      return serverChanges.changes
    }
    const diff = diffQuotes(accepted, current)
    return expired ? [{ type: 'QUOTE_EXPIRED' }, ...diff] : diff
  }

  return {
    accepted,
    outdated,
    changes,
    accept: () => {
      if (current) {
        setAccepted(current)
        setServerChanges(null)
      }
    },
    recordServerChanges: (quote: Quote, quoteChanges: QuoteChange[]) => setServerChanges({ quoteId: quote.id, changes: quoteChanges }),
  }
}
