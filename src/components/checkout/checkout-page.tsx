import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2, ShoppingCart } from 'lucide-react'
import type { NetworkId, Quote, Wallet } from '@/api/contracts'
import type { ApiError } from '@/api/errors'
import { BackButton } from '@/components/layout/back-button'
import { Container } from '@/components/layout/container'
import { CATALOG_HASH } from '@/components/layout/use-active-section'
import { Button } from '@/components/ui/button'
import { useCart, useCheckoutQuote } from '@/hooks/use-cart'
import { useNetworks } from '@/hooks/use-networks'
import { usePendingOrders } from '@/hooks/use-orders'
import { useProfile } from '@/hooks/use-profile'
import { useSession } from '@/hooks/use-session'
import { isConnectedOn, useWallets } from '@/hooks/use-wallets'
import { announce } from '@/lib/announcer'
import {
  CHECKOUT_FIELDS,
  CHECKOUT_FIELD_LABELS,
  buildOrderRequest,
  fullEnsName,
  toCheckoutErrors,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutField,
  type CheckoutValues,
} from '@/lib/checkout'
import { queryKeys } from '@/lib/query-keys'
import { describeQuoteChanges } from '@/lib/quote-changes'
import { cn } from '@/lib/utils'
import { shortAddress, walletTypeLabels } from '@/lib/wallets'
import { CheckoutSummary } from './checkout-summary'
import { CollectorForm } from './collector-form'
import { QuoteChangesNotice } from './quote-parts'
import { ReviewDialog, type ReviewEntry } from './review-dialog'
import { useAcceptedQuote } from './use-accepted-quote'
import { useCheckoutDraft } from './use-checkout-draft'
import { useOrderSubmission } from './use-order-submission'
import { WalletPicker } from './wallet-picker'

const confirmClass =
  'h-14 w-full rounded-full bg-linear-to-r from-primary-light to-primary-dark text-body-lg font-bold md:h-[2.8125rem] md:rounded-sm md:bg-none md:bg-primary md:text-body'

interface FormSummary {
  id: number
  message: string
}

function listLabels(labels: string[]): string {
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}` : labels[0]
}

export function CheckoutPage() {
  const { userId } = useSession()
  if (!userId) {
    return null
  }
  return <CheckoutScreen key={userId} userId={userId} />
}

function CheckoutScreen({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const cart = useCart()
  const profile = useProfile()
  const wallets = useWallets()
  const networks = useNetworks()
  const pendingOrders = usePendingOrders()
  const ready = !profile.isPending && !wallets.isPending && !networks.isPending
  const { draft, restored, setValue, setWallet, setNetwork, setAttempt, markCompleted } = useCheckoutDraft(userId, {
    ready,
    profile: profile.data,
    wallets: wallets.data,
    networks: networks.data,
  })
  const network = draft?.network ?? null
  const quote = useCheckoutQuote(cart.data, network)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [summary, setSummary] = useState<FormSummary | null>(null)
  const fields = useRef(new Map<CheckoutField, HTMLElement>())
  const summaryCount = useRef(0)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const focusAfterReview = useRef<CheckoutField | null>(null)
  const announceAfterReview = useRef<string | null>(null)

  const refreshQuote = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
  }, [queryClient, userId])
  const quotes = useAcceptedQuote(quote.data, reviewOpen, refreshQuote)

  const networkList = networks.data ?? []
  const networkLabel = (id: NetworkId) => networkList.find((entry) => entry.id === id)?.label ?? id
  const choice = draft?.wallet ?? null
  const savedWallet: Wallet | undefined =
    choice?.source === 'saved' ? wallets.data?.find((wallet) => wallet.id === choice.walletId) : undefined

  const submission = useOrderSubmission({
    userId,
    attempt: draft?.attempt ?? null,
    onAttemptChange: setAttempt,
    onCompleted: markCompleted,
    onRejected: handleRejected,
  })
  const locked = submission.busy

  const fieldRef = useCallback(
    (field: CheckoutField) => (element: HTMLElement | null) => {
      if (element) {
        fields.current.set(field, element)
      } else {
        fields.current.delete(field)
      }
    },
    [],
  )

  function showErrors(nextErrors: CheckoutErrors, message?: string) {
    const invalid = CHECKOUT_FIELDS.filter((field) => nextErrors[field])
    const summaryMessage =
      message ??
      (invalid.length === 1
        ? `Revise o campo ${CHECKOUT_FIELD_LABELS[invalid[0]]}: ${nextErrors[invalid[0]]}`
        : `Revise ${invalid.length} campos: ${listLabels(invalid.map((field) => CHECKOUT_FIELD_LABELS[field]))}.`)
    summaryCount.current += 1
    setErrors(nextErrors)
    setSummary({ id: summaryCount.current, message: summaryMessage })
    const first = invalid[0]
    focusAfterReview.current = first ?? null
    announceAfterReview.current = reviewOpen ? summaryMessage : null
    requestAnimationFrame(() => {
      const element = first ? fields.current.get(first) : undefined
      element?.focus()
      element?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
  }

  function clearError(field: CheckoutField) {
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function handleRejected(error: ApiError) {
    if ((error.code === 'QUOTE_OUTDATED' || error.code === 'AVAILABILITY_CONFLICT') && error.details.currentQuote) {
      const next = error.details.currentQuote
      quotes.recordServerChanges(next, error.details.quoteChanges ?? [])
      queryClient.setQueryData<Quote>(queryKeys.quotes.detail(userId, next.network), next)
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
      announce(`${error.message} Revise a nova cotação e confirme novamente.`)
      return
    }
    if (error.code === 'NOT_FOUND' || error.code === 'CART_EMPTY') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) })
      refreshQuote()
      announce(error.message)
      return
    }
    if (error.code === 'WALLET_NOT_CONNECTED') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
      showErrors({ wallet: error.message }, error.message)
      setReviewOpen(false)
      return
    }
    const apiErrors = toCheckoutErrors(error.fieldErrors)
    if (Object.keys(apiErrors).length > 0) {
      showErrors(apiErrors)
      setReviewOpen(false)
      return
    }
    announce(error.message)
  }

  function openReview() {
    if (!draft || locked) {
      return
    }
    const nextErrors = validateCheckout({
      values: draft.values,
      wallet: draft.wallet,
      network,
      savedWallet,
      connected: isConnectedOn(savedWallet, network),
      networkLabel: network ? networkLabel(network) : null,
    })
    if (Object.keys(nextErrors).length > 0) {
      showErrors(nextErrors)
      return
    }
    if (!quote.data) {
      announce('Aguarde o cálculo da cotação para revisar a compra.')
      return
    }
    setErrors({})
    setSummary(null)
    focusAfterReview.current = null
    submission.clearError()
    quotes.accept()
    setReviewOpen(true)
  }

  function confirm() {
    const accepted = quotes.accepted
    if (!draft?.wallet || !network || !accepted || quotes.outdated || !accepted.purchasable) {
      return
    }
    submission.submit(buildOrderRequest(draft.values, draft.wallet, network, accepted))
  }

  function changeValue<K extends keyof CheckoutValues>(field: K, value: CheckoutValues[K]) {
    setValue(field, value)
    const mapped: Partial<Record<keyof CheckoutValues, CheckoutField>> = {
      otherAddress: 'address',
      otherSecondaryAddress: 'secondaryAddress',
      otherWalletType: 'walletType',
    }
    clearError(mapped[field] ?? (field as CheckoutField))
  }

  function selectWallet(wallet: Wallet) {
    setWallet({ source: 'saved', walletId: wallet.id }, wallet.network)
    clearError('wallet')
    clearError('network')
  }

  function toggleOtherWallet(useOther: boolean) {
    const fallback = wallets.data?.[0]
    setWallet(useOther ? { source: 'other' } : fallback ? { source: 'saved', walletId: fallback.id } : null)
    clearError('wallet')
  }

  const items = cart.data?.items ?? []
  const pendingAttempt = !!draft?.attempt?.pending && submission.status !== 'idle'

  function renderBody() {
    if (cart.isPending || !draft) {
      return <CheckoutSkeleton />
    }
    if (pendingAttempt && !reviewOpen) {
      return <PendingAttempt stalled={submission.status === 'stalled'} onRetry={submission.retry} />
    }
    if (!cart.data) {
      return (
        <div role="alert" className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center">
          <AlertTriangle className="size-10 text-text-accent" aria-hidden="true" />
          <h2 className="text-body-lg font-bold text-foreground">Não foi possível carregar o carrinho</h2>
          <p className="text-body-sm text-text-secondary">{cart.error?.message ?? 'Tente novamente em instantes.'}</p>
          <Button onClick={() => void cart.refetch()} className="mt-2 font-bold">
            Tentar novamente
          </Button>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center">
          <ShoppingCart className="size-10 text-text-accent" aria-hidden="true" />
          <h2 className="text-body-lg font-bold text-foreground">Seu carrinho está vazio</h2>
          <p className="text-body-sm text-text-secondary">Adicione NFTs ao carrinho para finalizar uma compra.</p>
          <Button asChild className="mt-2 font-bold">
            <Link to="/" hash={CATALOG_HASH}>
              Explorar o catálogo
            </Link>
          </Button>
        </div>
      )
    }

    const outdatedInForm = quotes.outdated && !reviewOpen
    const changeMessages = quotes.accepted && quote.data ? describeQuoteChanges(quotes.changes(), quotes.accepted, quote.data, networkLabel) : []
    const notPurchasable = quote.data?.purchasable === false

    return (
      <form
        noValidate
        aria-labelledby="checkout-title"
        onSubmit={(event) => {
          event.preventDefault()
          openReview()
        }}
        className="mt-6 grid gap-y-10 md:mt-8 lg:grid-cols-[minmax(0,47.625rem)_25.3125rem] lg:grid-rows-[auto_auto_1fr] lg:justify-between lg:gap-x-8 lg:gap-y-8"
      >
        <div className="min-w-0 lg:row-span-3">
          {pendingOrders.data && pendingOrders.data.length > 0 && !submission.busy && (
            <PendingOrdersNotice orderIds={pendingOrders.data.map((order) => order.id)} />
          )}
          {summary && (
            <div key={summary.id} role="alert" className="mb-6 flex items-start gap-2 rounded-sm border border-text-coral p-3 text-body-sm text-text-coral">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {summary.message}
            </div>
          )}
          {restored && (
            <p className="mb-4 text-caption text-text-secondary">Recuperamos os dados que você tinha preenchido nesta compra.</p>
          )}
          <CollectorForm
            values={draft.values}
            errors={errors}
            wallet={choice}
            savedWallet={savedWallet}
            network={network}
            networks={networkList}
            disabled={locked}
            fieldRef={fieldRef}
            onValueChange={changeValue}
            onNetworkChange={(next) => {
              setNetwork(next)
              clearError('network')
              clearError('wallet')
            }}
            onUseOtherWallet={toggleOtherWallet}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {outdatedInForm && quotes.accepted && quote.data && (
            <QuoteChangesNotice
              title="Os valores da compra mudaram"
              messages={changeMessages}
              description="O resumo abaixo já mostra a nova cotação. Ela será usada na revisão."
            />
          )}
          <CheckoutSummary
            quote={quote.data}
            loading={quote.isPending}
            refreshing={quote.isFetching && !quote.isPending}
            error={quote.error}
            skeletonRows={items.length}
            onRetry={() => void quote.refetch()}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <WalletPicker
            wallets={wallets.data}
            loading={wallets.isPending}
            loadError={wallets.error}
            choice={choice}
            network={network}
            networks={networkList}
            error={errors.wallet}
            disabled={locked}
            focusRef={fieldRef('wallet')}
            onSelect={selectWallet}
            onRetry={() => void wallets.refetch()}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-3">
          {notPurchasable && (
            <p id="checkout-blocked" className="mb-3 flex items-start gap-2 text-caption text-text-coral">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Há itens esgotados ou acima do disponível.{' '}
                <Link to="/cart" className="font-bold underline underline-offset-4">
                  Ajustar o carrinho
                </Link>
              </span>
            </p>
          )}
          <Button
            ref={confirmRef}
            type="submit"
            aria-disabled={notPurchasable || locked || undefined}
            aria-describedby={notPurchasable ? 'checkout-blocked' : undefined}
            className={cn(confirmClass, (notPurchasable || locked) && 'cursor-not-allowed opacity-60')}
            onClick={(event) => {
              if (notPurchasable || locked) {
                event.preventDefault()
              }
            }}
          >
            Confirmar compra
          </Button>
        </div>
      </form>
    )
  }

  const reviewCollector: ReviewEntry[] = draft
    ? [
        { label: 'Nome de exibição', value: draft.values.displayName.trim() },
        { label: 'Nome de usuário', value: draft.values.username.trim() },
        { label: 'Nome do perfil', value: draft.values.profileName.trim() },
        { label: 'E-mail', value: draft.values.email.trim().toLowerCase() },
        { label: 'Nome ENS', value: fullEnsName(draft.values.ensName) },
        { label: 'Código de indicação', value: draft.values.referralCode.trim() },
      ]
    : []
  const reviewPayment: ReviewEntry[] = draft
    ? [
        ...(choice?.source === 'other'
          ? [
              { label: 'Carteira', value: `Outra carteira (${draft.values.otherWalletType ? walletTypeLabels[draft.values.otherWalletType] : '—'})` },
              { label: 'Endereço', value: draft.values.otherAddress.trim() },
              ...(draft.values.otherSecondaryAddress.trim()
                ? [{ label: 'ENS ou carteira secundária', value: draft.values.otherSecondaryAddress.trim() }]
                : []),
            ]
          : savedWallet
            ? [
                { label: 'Carteira', value: `${walletTypeLabels[savedWallet.walletType]} · ${savedWallet.nickname}` },
                { label: 'Endereço', value: shortAddress(savedWallet.address) },
                { label: 'Conexão', value: isConnectedOn(savedWallet, network) ? 'Conectada' : 'Desconectada' },
              ]
            : []),
        { label: 'Rede', value: network ? networkLabel(network) : '—' },
      ]
    : []

  return (
    <Container className="pt-6 pb-16 md:pt-6 md:pb-24">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center md:block">
        <BackButton className="md:hidden" />
        <h1 id="checkout-title" className="text-center text-[1.25rem] leading-7 font-bold text-foreground md:sr-only">
          Pagamento com carteira
        </h1>
      </div>
      <nav aria-label="Trilha de navegação" className="hidden h-6 items-center text-body-sm font-bold text-foreground md:flex">
        <ol className="flex items-center gap-2">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash={CATALOG_HASH} className="hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>

      <div aria-busy={cart.isPending || !draft}>{renderBody()}</div>

      <ReviewDialog
        open={reviewOpen}
        quote={quotes.accepted}
        collector={reviewCollector}
        payment={reviewPayment}
        note={draft?.values.note.trim() || null}
        outdated={quotes.outdated}
        changes={
          quotes.accepted && quote.data ? describeQuoteChanges(quotes.changes(), quotes.accepted, quote.data, networkLabel) : []
        }
        status={submission.status}
        errorMessage={submission.error?.message ?? null}
        onOpenChange={setReviewOpen}
        onAcceptQuote={() => {
          quotes.accept()
          submission.clearError()
          announce('A nova cotação está na revisão. Confira os valores e confirme a compra.')
        }}
        onConfirm={confirm}
        onRetry={submission.retry}
        returnFocus={() => {
          const field = focusAfterReview.current
          const message = announceAfterReview.current
          focusAfterReview.current = null
          announceAfterReview.current = null
          const target = (field && fields.current.get(field)) || confirmRef.current
          target?.focus()
          if (message) {
            requestAnimationFrame(() => announce(message))
          }
        }}
      />
    </Container>
  )
}

function PendingOrdersNotice({ orderIds }: { orderIds: string[] }) {
  const [first] = orderIds
  return (
    <output data-slot="pending-orders" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-text-accent p-3 text-body-sm">
      <Loader2 className="size-4 shrink-0 text-text-accent motion-safe:animate-spin" aria-hidden="true" />
      <span className="text-foreground">
        {orderIds.length === 1
          ? `O pedido ${first} está aguardando a confirmação do pagamento.`
          : `${orderIds.length} pedidos estão aguardando a confirmação do pagamento.`}
      </span>
      <Link to="/orders/$orderId" params={{ orderId: first }} className="font-bold text-text-accent underline underline-offset-4">
        Acompanhar pedido
      </Link>
    </output>
  )
}

function PendingAttempt({ stalled, onRetry }: { stalled: boolean; onRetry: () => void }) {
  return (
    <div
      role={stalled ? 'alert' : 'status'}
      className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center"
    >
      {stalled ? (
        <AlertTriangle className="size-10 text-text-accent" aria-hidden="true" />
      ) : (
        <Loader2 className="size-10 text-text-accent motion-safe:animate-spin" aria-hidden="true" />
      )}
      <h2 className="text-body-lg font-bold text-foreground">
        {stalled ? 'Ainda não conseguimos verificar o pedido' : 'Verificando o seu pedido'}
      </h2>
      <p className="text-body-sm text-text-secondary">
        Estamos consultando o pedido enviado anteriormente com a mesma identificação, sem criar outra compra. Os itens continuam no carrinho.
      </p>
      {stalled && (
        <Button onClick={onRetry} className="mt-2 font-bold">
          Verificar novamente
        </Button>
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-hidden="true" className="mt-6 grid gap-y-10 md:mt-8 lg:grid-cols-[minmax(0,47.625rem)_25.3125rem] lg:justify-between lg:gap-x-8">
      <p className="sr-only">Carregando o pagamento…</p>
      <div className="flex flex-col gap-5">
        <div className="skeleton-shimmer h-7 w-64 rounded-md bg-surface-raised" />
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="skeleton-shimmer h-5 w-40 rounded-md bg-surface-raised" />
              <div className="skeleton-shimmer h-10 w-full rounded-sm bg-surface-raised" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="skeleton-shimmer h-7 w-40 rounded-md bg-surface-raised" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-shimmer h-[4.375rem] w-full bg-surface-raised" />
        ))}
        <div className="skeleton-shimmer mt-4 h-40 w-full rounded-md bg-surface-raised" />
      </div>
    </div>
  )
}
