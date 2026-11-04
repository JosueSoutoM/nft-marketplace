import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { REALTIME_EVENT_TYPES, REALTIME_PATH, type RealtimeAuth, type ServerEvent } from '@/api/contracts'
import {
  applyNftUpdated,
  applyOrderUpdated,
  cachedNftVersion,
  cachedOrder,
  isTerminalOrder,
  reconcileActiveQueries,
} from './cache-updates'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface RealtimeIdentity {
  token: string | null
  userId: string | null
}

const MAX_SEEN_EVENT_IDS = 500
const RECONNECTION_DELAY_MS = 500
const RECONNECTION_DELAY_MAX_MS = 4000

function isServerEvent(payload: unknown): payload is ServerEvent {
  if (!payload || typeof payload !== 'object') {
    return false
  }
  const event = payload as Partial<ServerEvent>
  return (
    typeof event.id === 'string' &&
    (REALTIME_EVENT_TYPES as readonly unknown[]).includes(event.type) &&
    typeof event.resource?.id === 'string' &&
    typeof event.version === 'number' &&
    Number.isInteger(event.version) &&
    (event.userId === null || typeof event.userId === 'string') &&
    !!event.data &&
    typeof event.data === 'object'
  )
}

class RealtimeClient {
  #socket: Socket | null = null
  #generation = 0
  #status: RealtimeStatus = 'idle'
  #statusListeners = new Set<() => void>()
  #seenIds = new Set<string>()
  #seenOrder: string[] = []
  #appliedVersions = new Map<string, number>()
  #queryClient: QueryClient | null = null
  #identity: RealtimeIdentity = { token: null, userId: null }

  getStatus = (): RealtimeStatus => this.#status

  subscribe = (listener: () => void): (() => void) => {
    this.#statusListeners.add(listener)
    return () => {
      this.#statusListeners.delete(listener)
    }
  }

  #setStatus(status: RealtimeStatus): void {
    if (this.#status !== status) {
      this.#status = status
      this.#statusListeners.forEach((listener) => listener())
    }
  }

  async start(queryClient: QueryClient, identity: RealtimeIdentity): Promise<void> {
    this.stop()
    const generation = this.#generation
    this.#queryClient = queryClient
    this.#identity = identity
    this.#setStatus('connecting')

    const { io } = await import('socket.io-client')
    if (generation !== this.#generation) {
      return
    }

    const auth: RealtimeAuth = identity.token ? { token: identity.token } : {}
    const socket = io({
      path: REALTIME_PATH,
      transports: ['websocket'],
      autoConnect: false,
      forceNew: true,
      auth,
      reconnectionDelay: RECONNECTION_DELAY_MS,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
    })

    let connectedBefore = false
    socket.on('connect', () => {
      if (generation !== this.#generation) {
        return
      }
      if (connectedBefore) {
        reconcileActiveQueries(queryClient, identity.userId)
      }
      connectedBefore = true
      this.#setStatus('connected')
    })
    socket.on('disconnect', () => {
      if (generation === this.#generation) {
        this.#setStatus(socket.active ? 'reconnecting' : 'disconnected')
      }
    })
    socket.on('connect_error', () => {
      if (generation === this.#generation) {
        this.#setStatus(socket.active ? 'reconnecting' : 'disconnected')
      }
    })
    REALTIME_EVENT_TYPES.forEach((type) => socket.on(type, (payload: unknown) => this.#receive(generation, payload)))

    this.#socket = socket
    socket.connect()
  }

  stop(): void {
    this.#generation += 1
    const socket = this.#socket
    this.#socket = null
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }
    this.#seenIds.clear()
    this.#seenOrder = []
    for (const key of this.#appliedVersions.keys()) {
      if (key.startsWith('order:')) {
        this.#appliedVersions.delete(key)
      }
    }
    this.#identity = { token: null, userId: null }
    this.#setStatus(this.#status === 'idle' ? 'idle' : 'disconnected')
  }

  #remember(eventId: string): void {
    this.#seenIds.add(eventId)
    this.#seenOrder.push(eventId)
    if (this.#seenOrder.length > MAX_SEEN_EVENT_IDS) {
      const oldest = this.#seenOrder.shift()
      if (oldest) {
        this.#seenIds.delete(oldest)
      }
    }
  }

  #receive(generation: number, payload: unknown): void {
    const queryClient = this.#queryClient
    if (generation !== this.#generation || !queryClient || !isServerEvent(payload) || this.#seenIds.has(payload.id)) {
      return
    }
    this.#remember(payload.id)

    const { userId } = this.#identity
    if (payload.userId !== null && payload.userId !== userId) {
      return
    }

    const versionKey = `${payload.resource.type}:${payload.resource.id}`
    const knownVersion = Math.max(
      this.#appliedVersions.get(versionKey) ?? 0,
      payload.type === 'nft.updated'
        ? cachedNftVersion(queryClient, payload.resource.id, userId)
        : (userId && cachedOrder(queryClient, userId, payload.resource.id)?.version) || 0,
    )
    if (payload.version <= knownVersion) {
      return
    }
    if (payload.type === 'order.updated' && userId && isTerminalOrder(cachedOrder(queryClient, userId, payload.resource.id))) {
      return
    }
    this.#appliedVersions.set(versionKey, payload.version)

    if (payload.type === 'nft.updated') {
      applyNftUpdated(queryClient, payload, userId)
    } else if (userId) {
      applyOrderUpdated(queryClient, payload, userId)
    }
  }
}

export const realtimeClient = new RealtimeClient()
