import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { REALTIME_PATH, type RealtimeAuth, type ServerEvent } from '@/api/contracts'
import { buildNftUpdatedEvent, subscribeChanges } from '../changes'
import { getDb } from '../db'
import { hashToken } from '../db/crypto'
import { findActiveUserIdByTokenHash } from '../db/sessions'

const ENGINE_IO_PING_PACKET = '2'
const ENGINE_IO_PING_INTERVAL_MS = 25_000
const SOCKET_IO_CONNECT_PREFIX = '40'
const CLOSE_SERVICE_RESTART = 1012
const CLOSE_TRY_AGAIN_LATER = 1013
const REFUSAL_CLOSE_DELAY_MS = 50
const DEFAULT_STALE_NFT_ID = 'emerald-ape-042'
const STALE_PRICE = '0.01'

type SocketIo = ReturnType<typeof toSocketIo>

interface RealtimeConnection {
  id: string
  io: SocketIo
  tokenHash: string | null
  userId: string | null
  close: (code: number, reason: string) => void
}

export interface RealtimeServerStatus {
  connections: Array<{ id: string; userId: string | null }>
  refusingUntil: number | null
  lastEvent: { type: ServerEvent['type']; resourceId: string; version: number } | null
}

const connections = new Map<string, RealtimeConnection>()
const statusListeners = new Set<() => void>()
let refusingUntil = 0
let refusalTimer: ReturnType<typeof setTimeout> | null = null
let lastEvent: ServerEvent | null = null
let status: RealtimeServerStatus = buildStatus()

function buildStatus(): RealtimeServerStatus {
  return {
    connections: [...connections.values()].map(({ id, userId }) => ({ id, userId })),
    refusingUntil: refusingUntil > Date.now() ? refusingUntil : null,
    lastEvent: lastEvent && { type: lastEvent.type, resourceId: lastEvent.resource.id, version: lastEvent.version },
  }
}

function notifyStatus(): void {
  status = buildStatus()
  statusListeners.forEach((listener) => listener())
}

export function getRealtimeServerStatus(): RealtimeServerStatus {
  return status
}

export function subscribeRealtimeServerStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}

subscribeChanges((change) => {
  lastEvent = change.event
  notifyStatus()
})

function canReceive(connection: RealtimeConnection, event: ServerEvent): boolean {
  if (event.userId === null) {
    return true
  }
  return connection.tokenHash !== null && findActiveUserIdByTokenHash(connection.tokenHash) === event.userId
}

function deliver(connection: RealtimeConnection, event: ServerEvent): void {
  if (canReceive(connection, event)) {
    connection.io.client.emit(event.type, event)
  }
}

function readAuth(data: unknown): RealtimeAuth | null {
  if (typeof data !== 'string' || !data.startsWith(SOCKET_IO_CONNECT_PREFIX)) {
    return null
  }
  const payload = data.slice(SOCKET_IO_CONNECT_PREFIX.length)
  if (!payload) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(payload)
    return parsed && typeof parsed === 'object' ? (parsed as RealtimeAuth) : {}
  } catch {
    return {}
  }
}

async function authenticate(connection: RealtimeConnection, auth: RealtimeAuth): Promise<void> {
  if (typeof auth.token !== 'string' || !auth.token) {
    return
  }
  const tokenHash = await hashToken(auth.token)
  if (!connections.has(connection.id)) {
    return
  }
  connection.tokenHash = tokenHash
  connection.userId = findActiveUserIdByTokenHash(tokenHash)
  notifyStatus()
}

const realtime = ws.link(`${REALTIME_PATH}/`)

export const realtimeHandler = realtime.addEventListener('connection', (wsConnection) => {
  const { client } = wsConnection
  if (refusingUntil > Date.now()) {
    toSocketIo(wsConnection)
    setTimeout(() => client.close(CLOSE_TRY_AGAIN_LATER, 'Realtime unavailable'), REFUSAL_CLOSE_DELAY_MS)
    return
  }

  const connection: RealtimeConnection = {
    id: client.id,
    io: toSocketIo(wsConnection),
    tokenHash: null,
    userId: null,
    close: (code, reason) => client.close(code, reason),
  }
  connections.set(connection.id, connection)
  notifyStatus()

  let authenticated = false
  client.addEventListener('message', (event) => {
    if (authenticated) {
      return
    }
    const auth = readAuth(event.data)
    if (auth) {
      authenticated = true
      void authenticate(connection, auth)
    }
  })

  const ping = setInterval(() => client.send(ENGINE_IO_PING_PACKET), ENGINE_IO_PING_INTERVAL_MS)
  const unsubscribe = subscribeChanges((change) => deliver(connection, change.event))

  client.addEventListener('close', () => {
    clearInterval(ping)
    unsubscribe()
    connections.delete(connection.id)
    notifyStatus()
  })
})

export function dropRealtimeConnections(): number {
  const count = connections.size
  connections.forEach((connection) => connection.close(CLOSE_SERVICE_RESTART, 'Server restart'))
  return count
}

export function refuseRealtimeConnections(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Invalid refusal duration: ${seconds}`)
  }
  refusingUntil = Date.now() + seconds * 1000
  if (refusalTimer !== null) {
    clearTimeout(refusalTimer)
  }
  refusalTimer = setTimeout(() => {
    refusalTimer = null
    notifyStatus()
  }, seconds * 1000)
  dropRealtimeConnections()
  notifyStatus()
}

export function replayLastRealtimeEvent(): ServerEvent | null {
  if (!lastEvent) {
    return null
  }
  const event = lastEvent
  connections.forEach((connection) => deliver(connection, event))
  return structuredClone(event)
}

function staleEventFor(event: ServerEvent | null): ServerEvent | null {
  if (event?.type === 'order.updated') {
    const version = Math.max(0, event.version - 1)
    return {
      ...event,
      id: crypto.randomUUID(),
      version,
      occurredAt: new Date().toISOString(),
      data: { ...event.data, status: 'pending', version, transaction: null, decline: null },
    }
  }
  const nftId = event?.resource.id ?? DEFAULT_STALE_NFT_ID
  const nft = getDb().nfts.find((record) => record.id === nftId)
  if (!nft) {
    return null
  }
  const current = buildNftUpdatedEvent(nft)
  return {
    ...current,
    version: Math.max(0, nft.version - 1),
    data: {
      ...current.data,
      price: STALE_PRICE,
      editions: current.data.editions.map((edition) => ({ ...edition, price: STALE_PRICE })),
    },
  }
}

export function sendStaleRealtimeEvent(): ServerEvent | null {
  const event = staleEventFor(lastEvent)
  if (event) {
    connections.forEach((connection) => deliver(connection, event))
  }
  return event
}

export function resetRealtime(): void {
  lastEvent = null
  refusingUntil = 0
  if (refusalTimer !== null) {
    clearTimeout(refusalTimer)
    refusalTimer = null
  }
  notifyStatus()
}
