import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import thankYouIconUrl from '@/assets/icons/thank-you.svg'
import type { Order, OrderTransaction } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { announce } from '@/lib/announcer'
import { formatEth } from '@/lib/eth'
import { formatDateTime } from '@/lib/format-date'
import { shortAddress } from '@/lib/wallets'

const COPIED_FEEDBACK_MS = 2500

export function CopyTransactionButton({ hash }: { hash: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (state === 'idle') {
      return
    }
    const timer = setTimeout(() => setState('idle'), COPIED_FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(hash)
      setState('copied')
      announce('ID da transação copiado.')
    } catch {
      setState('failed')
      announce('Não foi possível copiar o ID da transação. Ele aparece completo em “Ver no explorador (simulado)”.')
    }
  }

  const Icon = state === 'copied' ? Check : Copy
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-text-accent transition-colors hover:bg-surface-raised"
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{state === 'copied' ? 'ID da transação copiado' : 'Copiar ID da transação'}</span>
    </button>
  )
}

type ExplorerDialogProps = {
  order: Order
  transaction: OrderTransaction
  networkLabel: string
}

export function SimulatedExplorerDialog({ order, transaction, networkLabel }: ExplorerDialogProps) {
  const { receipt } = order
  const entries = [
    { label: 'Hash da transação', value: transaction.hash },
    { label: 'Status', value: 'Confirmada (simulação)' },
    { label: 'Rede', value: networkLabel },
    { label: 'Confirmada em', value: formatDateTime(transaction.confirmedAt) },
    { label: 'Carteira', value: `${receipt.wallet.label} · ${shortAddress(receipt.wallet.address)}` },
    { label: 'Valor total', value: formatEth(receipt.total) },
    { label: 'Endereço simulado', value: transaction.explorerUrl },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-12 px-5 text-body font-bold">
          <ExternalLink className="size-4" aria-hidden="true" />
          Ver no explorador (simulado)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-5 sm:max-w-[34rem] md:p-8">
        <DialogTitle className="pr-10 text-[1.1875rem] leading-7">Explorador simulado</DialogTitle>
        <DialogDescription className="mt-1">
          Esta transação existe apenas na simulação da Kurio. Nenhuma rede ou explorador real foi consultado.
        </DialogDescription>
        <dl className="mt-5 grid gap-x-4 gap-y-2 text-body-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          {entries.map((entry) => (
            <div key={entry.label} className="contents">
              <dt className="text-text-secondary">{entry.label}</dt>
              <dd data-slot={entry.label === 'Hash da transação' ? 'explorer-hash' : undefined} className="mb-1 break-all text-foreground sm:mb-0">
                {entry.value}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}

export function ThankYouIcon() {
  return <img src={thankYouIconUrl} alt="" width={66} height={80} className="h-20 w-[4.125rem]" />
}
