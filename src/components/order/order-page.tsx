import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2, RefreshCw, SearchX, X, XCircle } from 'lucide-react'
import type { NetworkId, Order } from '@/api/contracts'
import { isApiError } from '@/api/errors'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNetworks } from '@/hooks/use-networks'
import { useOrder } from '@/hooks/use-orders'
import { useSession } from '@/hooks/use-session'
import { announce } from '@/lib/announcer'
import { clearCheckoutDraft } from '@/lib/checkout'
import { formatEth } from '@/lib/eth'
import { formatDateTime, formatShortDate } from '@/lib/format-date'
import { queryKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import { shortAddress } from '@/lib/wallets'
import { useRealtimeStatus } from '@/realtime/use-realtime-status'
import { OrderLines, OrderTotals } from './order-lines'
import { CopyTransactionButton, SimulatedExplorerDialog, ThankYouIcon } from './transaction-parts'

const cardClass = 'relative mx-auto w-full max-w-[36.25rem] border-b-[0.625rem] border-primary bg-surface-card'
const bodyClass = 'px-5 pt-6 pb-8 sm:px-[2.75rem]'

export function OrderPage({ orderId }: { orderId: string }) {
  const { userId } = useSession()
  if (!userId) {
    return null
  }
  return <OrderScreen key={`${userId}:${orderId}`} userId={userId} orderId={orderId} />
}

function terminalMessage(order: Order): string {
  return order.status === 'confirmed'
    ? `Pagamento confirmado. Seus NFTs agora estão na sua carteira. Pedido ${order.id}.`
    : `Pagamento recusado. ${order.decline?.reason ?? ''} Os itens continuam no seu carrinho.`
}

function useTerminalEffects(order: Order | undefined, userId: string, titleRef: RefObject<HTMLHeadingElement | null>) {
  const queryClient = useQueryClient()
  const handledStatus = useRef<Order['status'] | null>(null)
  const sawPending = useRef(false)
  const status = order?.status

  useEffect(() => {
    if (!order || !status) {
      return
    }
    if (status === 'pending') {
      sawPending.current = true
      return
    }
    if (handledStatus.current === status) {
      return
    }
    handledStatus.current = status
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.orders.all(userId), 'list'] })
    clearCheckoutDraft()
    requestAnimationFrame(() => titleRef.current?.focus())
    if (sawPending.current) {
      announce(terminalMessage(order))
    }
  }, [order, status, queryClient, userId, titleRef])
}

function OrderScreen({ userId, orderId }: { userId: string; orderId: string }) {
  const query = useOrder(orderId)
  const networks = useNetworks()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const order = query.data
  useTerminalEffects(order, userId, titleRef)
  const networkLabel = (id: NetworkId) => networks.data?.find((entry) => entry.id === id)?.label ?? id

  function renderContent(): ReactNode {
    if (order) {
      if (order.status === 'confirmed' && order.transaction) {
        return <ConfirmedOrder order={order} networkLabel={networkLabel} titleRef={titleRef} />
      }
      if (order.status === 'declined') {
        return <DeclinedOrder order={order} networkLabel={networkLabel} titleRef={titleRef} />
      }
      return (
        <PendingOrder
          order={order}
          networkLabel={networkLabel}
          titleRef={titleRef}
          refreshing={query.isFetching}
          refreshError={query.isError ? query.error.message : null}
          onRefresh={async () => {
            const result = await query.refetch()
            if (result.data?.status === 'pending') {
              announce('O pedido continua aguardando a confirmação do pagamento.')
            }
          }}
        />
      )
    }
    if (query.isPending) {
      return <OrderSkeleton />
    }
    if (isApiError(query.error) && query.error.status === 404) {
      return (
        <StateCard icon={<SearchX className="size-10 text-text-accent" aria-hidden="true" />} title="Pedido não encontrado" titleRef={titleRef}>
          <p className="text-body-sm text-text-secondary">Confira o endereço ou acompanhe as suas compras a partir do catálogo.</p>
          <Button asChild className="mt-2 font-bold">
            <Link to="/" hash={CATALOG_HASH}>
              Voltar ao catálogo
            </Link>
          </Button>
        </StateCard>
      )
    }
    return (
      <div role="alert">
        <StateCard icon={<AlertTriangle className="size-10 text-text-accent" aria-hidden="true" />} title="Não foi possível carregar o pedido" titleRef={titleRef}>
          <p className="text-body-sm text-text-secondary">{query.error?.message}</p>
          <Button onClick={() => void query.refetch()} className="mt-2 font-bold">
            Tentar novamente
          </Button>
        </StateCard>
      </div>
    )
  }

  return <Container className="py-8 md:py-12">{renderContent()}</Container>
}

function StateCard({ icon, title, titleRef, children }: { icon: ReactNode; title: string; titleRef: RefObject<HTMLHeadingElement | null>; children: ReactNode }) {
  return (
    <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center">
      {icon}
      <h1 ref={titleRef} tabIndex={-1} className="text-body-lg font-bold text-foreground outline-none">
        {title}
      </h1>
      {children}
    </div>
  )
}

type StateProps = {
  order: Order
  networkLabel: (id: NetworkId) => string
  titleRef: RefObject<HTMLHeadingElement | null>
}

function OrderFacts({ order, networkLabel }: Omit<StateProps, 'titleRef'>) {
  const { receipt } = order
  return (
    <dl className="grid gap-x-4 gap-y-1 text-body-sm sm:grid-cols-[auto_minmax(0,1fr)]">
      <dt className="text-text-secondary">Pedido</dt>
      <dd className="text-foreground">{order.id}</dd>
      <dt className="text-text-secondary">Criado em</dt>
      <dd className="text-foreground">{formatDateTime(order.createdAt)}</dd>
      <dt className="text-text-secondary">Rede</dt>
      <dd className="text-foreground">{networkLabel(receipt.network)}</dd>
      <dt className="text-text-secondary">Carteira</dt>
      <dd className="text-foreground">
        {receipt.wallet.label} · {shortAddress(receipt.wallet.address)}
      </dd>
    </dl>
  )
}

type PendingProps = StateProps & {
  refreshing: boolean
  refreshError: string | null
  onRefresh: () => Promise<void>
}

function PendingOrder({ order, networkLabel, titleRef, refreshing, refreshError, onRefresh }: PendingProps) {
  const realtime = useRealtimeStatus()
  const realtimeText =
    realtime === 'connected'
      ? 'A confirmação aparece aqui automaticamente, em tempo real.'
      : realtime === 'reconnecting' || realtime === 'disconnected'
        ? 'A conexão em tempo real caiu. Estamos reconectando; ao voltar, o status é conferido na API.'
        : 'Conectando ao tempo real…'

  return (
    <article data-slot="order-pending" className={cardClass}>
      <div className={bodyClass}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-12 text-primary motion-safe:animate-spin" aria-hidden="true" />
          <h1 ref={titleRef} tabIndex={-1} className="text-[1.1875rem] leading-7 font-bold text-text-secondary outline-none">
            Aguardando confirmação do pagamento
          </h1>
          <p className="text-body-sm text-text-secondary">
            O pedido {order.id} foi recebido e está pendente. Nenhuma compra nova é criada ao recarregar esta página.
          </p>
          <p data-slot="order-realtime" className="text-caption text-text-secondary">
            {realtimeText}
          </p>
          <Button
            type="button"
            variant="outline"
            aria-busy={refreshing || undefined}
            onClick={() => {
              if (!refreshing) {
                void onRefresh()
              }
            }}
            className={cn('mt-1 h-10 font-bold', refreshing && 'cursor-progress opacity-70')}
          >
            <RefreshCw className={cn('size-4', refreshing && 'motion-safe:animate-spin')} aria-hidden="true" />
            {refreshing ? 'Atualizando…' : 'Atualizar status'}
          </Button>
          {refreshError && (
            <p role="alert" className="text-caption text-text-coral">
              Não foi possível consultar o status: {refreshError}
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-6">
          <OrderFacts order={order} networkLabel={networkLabel} />
          <OrderLines receipt={order.receipt} title="Resumo do pedido" />
          <OrderTotals receipt={order.receipt} />
        </div>
      </div>
    </article>
  )
}

function DeclinedOrder({ order, networkLabel, titleRef }: StateProps) {
  return (
    <article data-slot="order-declined" className={cn(cardClass, 'border-text-coral')}>
      <div className={bodyClass}>
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle className="size-12 text-text-coral" aria-hidden="true" />
          <h1 ref={titleRef} tabIndex={-1} className="text-[1.1875rem] leading-7 font-bold text-foreground outline-none">
            Pagamento recusado
          </h1>
          <p data-slot="order-decline-reason" className="text-body-sm text-foreground">
            {order.decline?.reason}
          </p>
          <p className="text-body-sm text-text-secondary">
            Os itens continuam no seu carrinho. Para tentar de novo, volte ao pagamento: uma nova cotação será calculada e a nova tentativa
            terá outra identificação.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 font-bold">
              <Link to="/checkout">Voltar ao pagamento</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 font-bold">
              <Link to="/cart">Ver carrinho</Link>
            </Button>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-6">
          <OrderFacts order={order} networkLabel={networkLabel} />
          <OrderLines receipt={order.receipt} title="Itens do pedido recusado" />
          <OrderTotals receipt={order.receipt} />
        </div>
      </div>
    </article>
  )
}

function ConfirmedOrder({ order, networkLabel, titleRef }: StateProps) {
  const transaction = order.transaction
  if (!transaction) {
    return null
  }
  const { receipt } = order
  const network = networkLabel(receipt.network)
  const facts = [
    { label: 'Data', value: formatShortDate(transaction.confirmedAt) },
    { label: 'Total', value: formatEth(receipt.total) },
    { label: 'Carteira', value: receipt.wallet.label, strong: true },
  ]

  return (
    <article data-slot="order-confirmed" className={cardClass}>
      <Link
        to="/"
        hash={CATALOG_HASH}
        aria-label="Fechar e voltar ao catálogo"
        className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-raised"
      >
        <X className="size-5" aria-hidden="true" />
      </Link>
      <div className="flex flex-col items-center px-5 pt-7 pb-6 text-center">
        <ThankYouIcon />
        <h1 ref={titleRef} tabIndex={-1} className="mt-5 text-[1.1875rem] leading-7 font-bold text-text-secondary outline-none">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-primary px-5 py-4 sm:grid-cols-[auto_auto_auto_auto] sm:justify-between sm:gap-x-0 sm:gap-y-0">
        <div className="min-w-0 sm:border-r sm:border-primary sm:pr-3">
          <dt className="text-body-sm font-bold whitespace-nowrap text-text-secondary">ID da transação</dt>
          <dd className="flex items-center gap-1 text-body-sm whitespace-nowrap text-text-secondary sm:text-body">
            <span data-slot="order-transaction-id" title={transaction.hash}>
              <span aria-hidden="true">{shortAddress(transaction.hash)}</span>
              <span className="sr-only">{transaction.hash}</span>
            </span>
            <CopyTransactionButton hash={transaction.hash} />
          </dd>
        </div>
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={cn('min-w-0 sm:px-3', index < facts.length - 1 && 'sm:border-r sm:border-primary', index === facts.length - 1 && 'sm:pr-0')}
          >
            <dt className={cn('text-body-sm whitespace-nowrap text-text-secondary', fact.strong && 'font-bold')}>{fact.label}</dt>
            <dd data-slot={`order-fact-${index}`} className="text-body-sm whitespace-nowrap text-text-secondary sm:text-body">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className={bodyClass}>
        <OrderLines receipt={receipt} title="Detalhes da transação" />
        <OrderTotals receipt={receipt} />
        <p className="mt-5 text-center text-body-sm text-text-secondary">
          Transação simulada confirmada na {network}. A propriedade foi registrada para a carteira {receipt.wallet.label} (
          {shortAddress(receipt.wallet.address)}).
        </p>
        <div className="mt-6 flex flex-col items-center gap-4">
          <SimulatedExplorerDialog order={order} transaction={transaction} networkLabel={network} />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-body-sm font-bold">
            <Link to="/" hash={CATALOG_HASH} className="text-text-accent underline-offset-4 hover:underline">
              Voltar ao catálogo
            </Link>
            <Link to="/cart" className="text-text-accent underline-offset-4 hover:underline">
              Ver carrinho
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function OrderSkeleton() {
  return (
    <>
      <output className="sr-only">Carregando o pedido…</output>
      <div aria-hidden="true" className={cardClass}>
      <div className={bodyClass}>
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="mt-8 flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[4.375rem] w-full" />
          ))}
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      </div>
    </>
  )
}
