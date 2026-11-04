import type { Order, OrderLine } from '@/api/contracts'
import { publishOrderUpdated } from '../changes'
import { commit, getDb, type OrderRecord } from '../db'
import { isManualSettlement } from '../scenarios'
import { deterministicHex } from '../hex'
import { removePurchasedItems } from './carts'
import { findEdition, findNft, updateNftEditions } from './catalog'

type TerminalStatus = 'confirmed' | 'declined'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function findOrderRecord(orderId: string): OrderRecord | null {
  return getDb().orders.find((record) => record.order.id === orderId) ?? null
}

function clearTimer(orderId: string): void {
  const timer = timers.get(orderId)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(orderId)
  }
}

export function clearSettlementTimers(): void {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
}

export function scheduleSettlement(record: OrderRecord): void {
  const orderId = record.order.id
  clearTimer(orderId)
  if (isManualSettlement()) {
    return
  }
  const wait = Math.max(0, Date.parse(record.settleAt) - Date.now())
  timers.set(
    orderId,
    setTimeout(() => {
      timers.delete(orderId)
      if (findOrderRecord(orderId)) {
        settleOrder(orderId)
      }
    }, wait),
  )
}

function groupByEdition(lines: OrderLine[]): Map<string, Map<string, number>> {
  const byNft = new Map<string, Map<string, number>>()
  for (const line of lines) {
    const editions = byNft.get(line.nftId) ?? new Map<string, number>()
    editions.set(line.editionId, (editions.get(line.editionId) ?? 0) + line.quantity)
    byNft.set(line.nftId, editions)
  }
  return byNft
}

function findUnavailableLine(lines: OrderLine[]): OrderLine | null {
  for (const [nftId, editions] of groupByEdition(lines)) {
    const nft = findNft(nftId)
    for (const [editionId, quantity] of editions) {
      const edition = nft && findEdition(nft, editionId)
      if (!edition || edition.available < quantity) {
        return lines.find((line) => line.nftId === nftId && line.editionId === editionId) ?? null
      }
    }
  }
  return null
}

function confirm(record: OrderRecord, now: string): void {
  const { order } = record
  const unavailable = findUnavailableLine(order.receipt.lines)
  if (unavailable) {
    order.status = 'declined'
    order.decline = {
      code: 'AVAILABILITY_LOST',
      reason: `${unavailable.name} (edição ${unavailable.editionLabel}) esgotou antes da confirmação. Nenhum valor foi cobrado.`,
    }
    return
  }
  for (const [nftId, editions] of groupByEdition(order.receipt.lines)) {
    const nft = findNft(nftId)
    updateNftEditions(
      nftId,
      [...editions].map(([editionId, quantity]) => ({
        editionId,
        available: (nft ? (findEdition(nft, editionId)?.available ?? 0) : 0) - quantity,
      })),
    )
  }
  removePurchasedItems(record.userId, order.receipt.lines, order.receipt.couponCode)
  const network = getDb().networks.find((entry) => entry.id === order.receipt.network)
  const hash = `0x${deterministicHex(`${order.id}:${record.idempotencyKey}`, 64)}`
  order.status = 'confirmed'
  order.transaction = {
    hash,
    explorerUrl: `${network?.explorerBaseUrl ?? 'https://explorer.kurio.test/ethereum/tx/'}${hash}`,
    confirmedAt: now,
  }
}

export function settleOrder(orderId: string, status?: TerminalStatus): Order {
  const record = findOrderRecord(orderId)
  if (!record) {
    throw new Error(`Unknown order: ${orderId}`)
  }
  if (record.order.status !== 'pending') {
    return record.order
  }
  clearTimer(orderId)
  const now = new Date().toISOString()
  if ((status ?? record.plannedOutcome) === 'confirmed') {
    confirm(record, now)
  } else {
    record.order.status = 'declined'
    record.order.decline = {
      code: 'PAYMENT_DECLINED',
      reason: 'O pagamento foi recusado pela carteira. Nenhum valor foi cobrado.',
    }
  }
  record.order.version += 1
  record.order.updatedAt = now
  commit()
  publishOrderUpdated(record.order, record.userId)
  return record.order
}

export function settleIfOverdue(record: OrderRecord): void {
  if (record.order.status === 'pending' && !isManualSettlement() && Date.parse(record.settleAt) <= Date.now()) {
    settleOrder(record.order.id)
  }
}

export function resumePendingOrders(): void {
  for (const record of getDb().orders) {
    if (record.order.status === 'pending') {
      scheduleSettlement(record)
    }
  }
}
