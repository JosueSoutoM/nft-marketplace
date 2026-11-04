import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { CreateOrderRequest, Order } from '@/api/contracts'
import { toApiError, type ApiError } from '@/api/errors'
import { createIdempotencyKey, createOrder } from '@/api/orders'
import { getSessionSnapshot } from '@/api/session-token'
import { announce } from '@/lib/announcer'
import { clearCheckoutDraft, type OrderAttempt } from '@/lib/checkout'
import { queryKeys } from '@/lib/query-keys'
import { stableStringify } from '@/lib/stable-stringify'

export const ORDER_RETRY_DELAYS_MS = [1000, 2000, 4000]

export type SubmissionStatus = 'idle' | 'sending' | 'verifying' | 'stalled'

interface SubmissionOptions {
  userId: string
  attempt: OrderAttempt | null
  onAttemptChange: (attempt: OrderAttempt | null) => void
  onCompleted: () => void
  onRejected: (error: ApiError) => void
}

export function useOrderSubmission({ userId, attempt, onAttemptChange, onCompleted, onRejected }: SubmissionOptions) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [status, setStatus] = useState<SubmissionStatus>('idle')
  const [error, setError] = useState<ApiError | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredAttempt = useRef(attempt?.pending ? attempt : null)
  const callbacks = useRef({ onAttemptChange, onCompleted, onRejected })
  const sendRef = useRef<(current: OrderAttempt, retry: number) => Promise<void>>(async () => {})

  function isCurrentUser(): boolean {
    return getSessionSnapshot().session?.userId === userId
  }

  function finish(order: Order) {
    queryClient.setQueryData<Order>(queryKeys.orders.detail(userId, order.id), (cached) =>
      !cached || cached.version < order.version ? order : cached,
    )
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.orders.all(userId), 'list'] })
    clearCheckoutDraft()
    callbacks.current.onCompleted()
    if (!mounted.current) {
      return
    }
    announce(`Pedido ${order.id} enviado. Aguardando a confirmação do pagamento.`)
    void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
  }

  async function send(current: OrderAttempt, retry: number): Promise<void> {
    inFlight.current = true
    setStatus(retry === 0 ? 'sending' : 'verifying')
    setError(null)
    try {
      const order = await createOrder(current.request, { idempotencyKey: current.key })
      inFlight.current = false
      if (isCurrentUser()) {
        finish(order)
      }
    } catch (raw) {
      const apiError = toApiError(raw)
      if (!isCurrentUser() || apiError.status === 401) {
        inFlight.current = false
        setStatus('idle')
        return
      }
      if (apiError.isTransient) {
        if (!mounted.current) {
          inFlight.current = false
          return
        }
        if (retry < ORDER_RETRY_DELAYS_MS.length) {
          setStatus('verifying')
          announce('Estamos verificando o seu pedido. Não é preciso enviar de novo.')
          retryTimer.current = setTimeout(() => void sendRef.current(current, retry + 1), ORDER_RETRY_DELAYS_MS[retry])
          return
        }
        inFlight.current = false
        setStatus('stalled')
        setError(apiError)
        announce('Ainda não conseguimos confirmar o recebimento do pedido. Os itens continuam no carrinho.')
        return
      }
      inFlight.current = false
      setStatus('idle')
      setError(apiError)
      callbacks.current.onAttemptChange({ ...current, pending: false })
      callbacks.current.onRejected(apiError)
    }
  }

  useLayoutEffect(() => {
    callbacks.current = { onAttemptChange, onCompleted, onRejected }
    sendRef.current = send
  })

  useEffect(() => {
    mounted.current = true
    const restored = restoredAttempt.current
    if (restored && !inFlight.current) {
      announce('Estamos verificando o pedido enviado anteriormente.')
      void sendRef.current(restored, 1)
    }
    return () => {
      mounted.current = false
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
        retryTimer.current = null
        inFlight.current = false
      }
    }
  }, [])

  function submit(request: CreateOrderRequest) {
    if (inFlight.current) {
      return
    }
    const fingerprint = stableStringify(request)
    const key = attempt && attempt.fingerprint === fingerprint ? attempt.key : createIdempotencyKey()
    const current: OrderAttempt = { key, fingerprint, request, pending: true }
    callbacks.current.onAttemptChange(current)
    void send(current, 0)
  }

  function retry() {
    if (attempt && !inFlight.current) {
      void send({ ...attempt, pending: true }, 1)
    }
  }

  function clearError() {
    setError(null)
  }

  return { status, error, busy: status === 'sending' || status === 'verifying', submit, retry, clearError }
}
