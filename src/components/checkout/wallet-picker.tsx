import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Network, NetworkId, Wallet } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isConnectedOn, useConnectWallet, useDisconnectWallet } from '@/hooks/use-wallets'
import { announce } from '@/lib/announcer'
import type { WalletChoice } from '@/lib/checkout'
import { cn } from '@/lib/utils'
import { shortAddress, walletSlotLabels, walletTypeLabels } from '@/lib/wallets'

type WalletPickerProps = {
  wallets: Wallet[] | undefined
  loading: boolean
  loadError: Error | null
  choice: WalletChoice | null
  network: NetworkId | null
  networks: Network[]
  error?: string
  disabled: boolean
  focusRef: (element: HTMLElement | null) => void
  onSelect: (wallet: Wallet) => void
  onRetry: () => void
}

export function WalletPicker({ wallets, loading, loadError, choice, network, networks, error, disabled, focusRef, onSelect, onRetry }: WalletPickerProps) {
  const titleId = useId()
  const errorId = useId()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const [feedback, setFeedback] = useState<{ walletId: string; message: string } | null>(null)
  const networkLabel = (id: NetworkId) => networks.find((entry) => entry.id === id)?.label ?? id
  const selectedId = choice?.source === 'saved' ? choice.walletId : null
  const busyWalletId = connect.isPending
    ? connect.variables?.walletId
    : disconnect.isPending
      ? disconnect.variables?.walletId
      : undefined

  function handleConnect(wallet: Wallet) {
    if (!network || busyWalletId) {
      return
    }
    setFeedback(null)
    const label = walletTypeLabels[wallet.walletType]
    connect.mutate(
      { walletId: wallet.id, network },
      {
        onSuccess: () => announce(`${label} conectada na rede ${networkLabel(network)}.`),
        onError: (failure) => {
          const message =
            isApiError(failure) && failure.code === 'WALLET_CONNECTION_REJECTED'
              ? `${failure.message} Confirme a solicitação na ${label} e tente novamente.`
              : failure.message
          setFeedback({ walletId: wallet.id, message })
          announce(message)
        },
      },
    )
  }

  function handleDisconnect(wallet: Wallet) {
    if (busyWalletId) {
      return
    }
    setFeedback(null)
    disconnect.mutate(
      { walletId: wallet.id },
      {
        onSuccess: () => announce(`${walletTypeLabels[wallet.walletType]} desconectada.`),
        onError: (failure) => {
          setFeedback({ walletId: wallet.id, message: failure.message })
          announce(failure.message)
        },
      },
    )
  }

  function renderOptions() {
    if (loading) {
      return (
        <div aria-hidden="true" className="flex flex-col gap-4">
          <Skeleton className="h-[6.5rem] w-full rounded-[1.25rem] md:rounded-sm" />
          <Skeleton className="h-[6.5rem] w-full rounded-[1.25rem] md:rounded-sm" />
        </div>
      )
    }
    if (!wallets) {
      return (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-sm bg-surface-card p-4 text-body-sm">
          <p className="text-foreground">Não foi possível carregar suas carteiras.</p>
          <p className="text-text-secondary">{loadError?.message}</p>
          <Button size="sm" onClick={onRetry} className="font-bold">
            Tentar novamente
          </Button>
        </div>
      )
    }
    if (wallets.length === 0) {
      return (
        <div className="flex flex-col items-start gap-3 rounded-sm bg-surface-card p-4 text-body-sm">
          <p className="text-foreground">Você ainda não tem carteiras cadastradas.</p>
          <p className="text-text-secondary">Cadastre a carteira principal ou marque “Usar outra carteira?” no formulário.</p>
          <Link ref={selectedId ? undefined : focusRef} to="/wallets" className="font-bold text-text-accent underline underline-offset-4">
            Cadastrar carteira
          </Link>
        </div>
      )
    }
    return (
      <ul className="flex flex-col gap-4">
        {wallets.map((wallet) => (
          <WalletOption
            key={wallet.id}
            wallet={wallet}
            checked={wallet.id === selectedId}
            network={network}
            networkLabel={networkLabel}
            busy={busyWalletId === wallet.id}
            locked={disabled || (!!busyWalletId && busyWalletId !== wallet.id)}
            feedback={feedback?.walletId === wallet.id ? feedback.message : null}
            describedBy={error ? errorId : undefined}
            focusRef={wallet.id === selectedId || (!selectedId && wallet === wallets[0]) ? focusRef : undefined}
            onSelect={() => onSelect(wallet)}
            onConnect={() => handleConnect(wallet)}
            onDisconnect={() => handleDisconnect(wallet)}
          />
        ))}
      </ul>
    )
  }

  return (
    <section aria-labelledby={titleId} className="min-w-0">
      <div className="flex items-baseline justify-between gap-4 md:justify-center">
        <h2 id={titleId} className="text-body font-bold whitespace-nowrap text-foreground sm:text-body-lg md:text-[1.1875rem] md:leading-7">
          <span className="md:hidden">Carteira conectada</span>
          <span className="hidden md:inline">Carteira e rede</span>
        </h2>
        <Link to="/wallets" className="text-body font-bold whitespace-nowrap text-text-accent hover:underline sm:text-body-lg md:hidden">
          Trocar carteira
        </Link>
      </div>
      <p className="mt-4 hidden w-fit rounded-sm border border-border-soft bg-surface-dark px-2.5 py-1 text-tiny font-bold tracking-wide text-text-accent uppercase md:block">
        <span className="sr-only">Carteiras compatíveis: </span>
        MetaMask · WalletConnect · Coinbase
      </p>
      <div role="radiogroup" aria-labelledby={titleId} aria-describedby={error ? errorId : undefined} className="mt-4">
        {renderOptions()}
      </div>
      {error && (
        <p id={errorId} className="mt-3 flex items-start gap-2 text-caption text-text-coral">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </section>
  )
}

type WalletOptionProps = {
  wallet: Wallet
  checked: boolean
  network: NetworkId | null
  networkLabel: (id: NetworkId) => string
  busy: boolean
  locked: boolean
  feedback: string | null
  describedBy?: string
  focusRef?: (element: HTMLElement | null) => void
  onSelect: () => void
  onConnect: () => void
  onDisconnect: () => void
}

function connectionText(wallet: Wallet, network: NetworkId | null, networkLabel: (id: NetworkId) => string): string {
  const connection = wallet.connection
  if (!connection || connection.status !== 'connected') {
    return 'Desconectada'
  }
  if (network && connection.network !== network) {
    return `Conectada na rede ${networkLabel(connection.network)}. Conecte na rede ${networkLabel(network)} para pagar.`
  }
  return `Conectada na rede ${networkLabel(connection.network)}`
}

function WalletOption({
  wallet,
  checked,
  network,
  networkLabel,
  busy,
  locked,
  feedback,
  describedBy,
  focusRef,
  onSelect,
  onConnect,
  onDisconnect,
}: WalletOptionProps) {
  const id = useId()
  const statusId = `${id}-status`
  const feedbackId = `${id}-feedback`
  const label = walletTypeLabels[wallet.walletType]
  const ready = isConnectedOn(wallet, network)
  const connected = wallet.connection?.status === 'connected'
  const canConnect = !connected || !ready
  const status = busy ? (canConnect ? 'Conectando…' : 'Desconectando…') : connectionText(wallet, network, networkLabel)
  const actionRef = checked ? focusRef : undefined

  return (
    <li
      data-slot="wallet-option"
      aria-label={`${label}, carteira ${walletSlotLabels[wallet.slot].toLowerCase()}`}
      className={cn(
        'rounded-[1.25rem] border bg-surface-card transition-colors md:rounded-sm md:bg-transparent',
        checked ? 'border-primary' : 'border-transparent md:border-border',
      )}
    >
      <div className="flex items-start gap-4 px-5 pt-4 md:px-4 md:pt-3">
        <input
          ref={checked ? undefined : focusRef}
          id={id}
          type="radio"
          name="checkout-wallet"
          checked={checked}
          disabled={locked && !checked}
          aria-describedby={[statusId, describedBy].filter(Boolean).join(' ')}
          onChange={onSelect}
          className="mt-1 size-[1.125rem] shrink-0 cursor-pointer appearance-none rounded-full border-2 border-primary checked:border-[0.3125rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col">
          <span className="text-body-lg font-bold text-foreground md:text-body md:font-normal">
            {label}
            <span className="font-normal text-text-secondary"> · {walletSlotLabels[wallet.slot]}</span>
          </span>
          <span className="truncate text-body text-secondary md:text-caption md:leading-5" title={wallet.address}>
            {wallet.nickname} · {shortAddress(wallet.address)}
          </span>
          <span className="text-body text-secondary md:text-caption md:leading-5">Rede {networkLabel(wallet.network)}</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 pt-3 pb-4 md:px-4 md:pt-2 md:pb-3">
        <p
          id={statusId}
          data-slot="wallet-status"
          className={cn('flex min-w-0 flex-1 items-start gap-1.5 text-caption', ready ? 'text-success' : 'text-text-secondary')}
        >
          {ready && !busy && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
          <span>{status}</span>
        </p>
        <Button
          ref={actionRef}
          type="button"
          size="sm"
          variant="outline"
          aria-disabled={busy || locked || (canConnect && !network) || undefined}
          aria-busy={busy || undefined}
          aria-describedby={feedback ? feedbackId : statusId}
          onClick={() => {
            if (busy || locked || (canConnect && !network)) {
              return
            }
            if (canConnect) {
              onConnect()
            } else {
              onDisconnect()
            }
          }}
          className={cn('h-8 px-3 text-caption font-bold', (busy || locked) && 'cursor-not-allowed opacity-60')}
        >
          {canConnect ? 'Conectar' : 'Desconectar'}
          <span className="sr-only"> {label}</span>
        </Button>
      </div>
      {feedback && (
        <p id={feedbackId} role="alert" className="flex items-start gap-2 px-5 pb-4 text-caption text-text-coral md:px-4 md:pb-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {feedback}
        </p>
      )}
    </li>
  )
}
