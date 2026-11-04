import { useEffect, useRef, useState } from 'react'
import type { Network, Profile, Wallet, WalletSlot } from '@/api/contracts'
import { useSaveWallet } from '@/hooks/use-wallets'
import { announce } from '@/lib/announcer'
import { walletFormValues, walletTypeLabels } from '@/lib/wallets'
import { WalletForm } from './wallet-form'

const TITLES: Record<WalletSlot, string> = {
  primary: 'Carteira principal',
  secondary: 'Carteira secundária',
}

const actionClass =
  'shrink-0 rounded-sm text-body-lg font-bold text-text-accent hover:underline disabled:opacity-50 disabled:hover:no-underline'

type WalletSectionProps = {
  slot: WalletSlot
  wallet: Wallet | undefined
  primary: Wallet | undefined
  profile: Profile | undefined
  networks: Network[]
}

function WalletSummary({ wallet, networks }: { wallet: Wallet; networks: Network[] }) {
  const network = networks.find((entry) => entry.id === wallet.network)?.label ?? wallet.network
  const rows = [
    ['Apelido', wallet.nickname],
    ['Tipo de carteira', walletTypeLabels[wallet.walletType]],
    ['Rede', network],
    ['Endereço', wallet.address],
    ['ENS ou carteira secundária', wallet.secondaryAddress ?? 'Não informado'],
    ['Nome ENS', wallet.ensName],
  ]
  return (
    <dl data-slot="wallet-summary" className="mt-5 grid gap-x-7 gap-y-4 rounded-sm border border-border bg-surface-card p-5 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-caption text-text-secondary">{label}</dt>
          <dd className="mt-1 break-all text-body-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function WalletSection({ slot, wallet, primary, profile, networks }: WalletSectionProps) {
  const title = TITLES[slot]
  const titleId = `wallet-${slot}-title`
  const [editing, setEditing] = useState(slot === 'primary' && !wallet)
  const [error, setError] = useState<string | null>(null)
  const [mirroring, setMirroring] = useState(false)
  const actionRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef(false)
  const save = useSaveWallet()
  const mirrored = slot === 'secondary' && wallet?.sameAsPrimary === true
  const formRequired = slot === 'primary' && !wallet

  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false
      actionRef.current?.focus()
    }
  }, [editing])

  function closeForm() {
    returnFocus.current = true
    setEditing(false)
  }

  function toggleMirror(checked: boolean) {
    setError(null)
    if (!checked) {
      setEditing(true)
      return
    }
    setEditing(false)
    setMirroring(true)
    save.mutate(
      { slot: 'secondary', body: { sameAsPrimary: true } },
      {
        onSuccess: () => announce('Carteira secundária igual à carteira principal.'),
        onError: (failure) => {
          setError(failure.message)
          announce(failure.message)
        },
        onSettled: () => setMirroring(false),
      },
    )
  }

  const description =
    slot === 'primary'
      ? 'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'
      : !wallet
        ? 'Você ainda não adicionou uma carteira secundária.'
        : mirrored
          ? 'Usa os mesmos dados da carteira principal e acompanha suas alterações.'
          : null

  return (
    <section aria-labelledby={titleId} className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-display-sm text-foreground">
            {title}
          </h2>
          {description && <p className="mt-1 text-body-sm text-text-accent">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {slot === 'secondary' && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-body text-foreground has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <input
                type="checkbox"
                checked={mirroring || (mirrored && !editing)}
                disabled={!primary || save.isPending}
                aria-describedby={primary ? undefined : `${titleId}-hint`}
                onChange={(event) => toggleMirror(event.target.checked)}
                className="size-[1.125rem] shrink-0 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[0.3125rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
              />
              Igual à carteira principal
            </label>
          )}
          {!editing && (
            <button
              ref={actionRef}
              type="button"
              disabled={slot === 'secondary' && !primary}
              aria-describedby={slot === 'secondary' && !primary ? `${titleId}-hint` : undefined}
              onClick={() => {
                setError(null)
                setEditing(true)
              }}
              className={actionClass}
            >
              {wallet ? 'Editar' : 'Adicionar'}
              <span className="sr-only"> {title.toLowerCase()}</span>
            </button>
          )}
        </div>
      </div>
      {slot === 'secondary' && !primary && (
        <p id={`${titleId}-hint`} className="mt-2 text-caption text-text-secondary">
          Cadastre a carteira principal primeiro.
        </p>
      )}
      <div role="alert">{error && <p className="mt-3 text-caption text-text-coral">{error}</p>}</div>
      {editing ? (
        <WalletForm
          slot={slot}
          title={title}
          initialValues={walletFormValues(wallet, profile)}
          networks={networks}
          onSaved={closeForm}
          onCancel={formRequired ? undefined : closeForm}
        />
      ) : (
        wallet && <WalletSummary wallet={wallet} networks={networks} />
      )}
    </section>
  )
}
