import { useEffect, useRef, useState } from 'react'
import type { Network, NetworkId, Profile, Wallet } from '@/api/contracts'
import { getSessionSnapshot } from '@/api/session-token'
import {
  initialCheckoutValues,
  readCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
  type CheckoutValues,
  type OrderAttempt,
  type WalletChoice,
} from '@/lib/checkout'
import { onSessionInterrupted } from '@/lib/session-resume'

interface DraftSources {
  ready: boolean
  profile: Profile | undefined
  wallets: Wallet[] | undefined
  networks: Network[] | undefined
}

function initialDraft({ profile, wallets, networks }: DraftSources): CheckoutDraft {
  const wallet = wallets?.[0]
  return {
    values: initialCheckoutValues(profile, wallet),
    wallet: wallet ? { source: 'saved', walletId: wallet.id } : null,
    network: wallet?.network ?? networks?.[0]?.id ?? null,
    attempt: null,
  }
}

export function useCheckoutDraft(userId: string, sources: DraftSources) {
  const [draft, setDraft] = useState<CheckoutDraft | null>(() => readCheckoutDraft(userId))
  const [restored] = useState(() => draft !== null)
  const latest = useRef(draft)
  const completed = useRef(false)

  if (!draft && sources.ready) {
    setDraft(initialDraft(sources))
  }

  useEffect(() => {
    latest.current = draft
    if (draft && !completed.current && getSessionSnapshot().session?.userId === userId) {
      saveCheckoutDraft(userId, draft)
    }
  }, [draft, userId])

  useEffect(
    () =>
      onSessionInterrupted(() => {
        if (latest.current && !completed.current) {
          saveCheckoutDraft(userId, latest.current)
        }
      }),
    [userId],
  )

  function update(change: (current: CheckoutDraft) => CheckoutDraft) {
    setDraft((current) => (current ? change(current) : current))
  }

  return {
    draft,
    restored,
    setValue: <K extends keyof CheckoutValues>(field: K, value: CheckoutValues[K]) =>
      update((current) => ({ ...current, values: { ...current.values, [field]: value } })),
    setWallet: (wallet: WalletChoice | null, network?: NetworkId) =>
      update((current) => ({ ...current, wallet, network: network ?? current.network })),
    setNetwork: (network: NetworkId) => update((current) => ({ ...current, network })),
    setAttempt: (attempt: OrderAttempt | null) => update((current) => ({ ...current, attempt })),
    markCompleted: () => {
      completed.current = true
    },
  }
}
