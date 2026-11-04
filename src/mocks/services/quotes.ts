import {
  QUOTE_TTL_SECONDS,
  type Network,
  type NetworkId,
  type Quote,
  type QuoteChange,
  type QuoteLine,
  type QuoteLineIssue,
} from '@/api/contracts'
import { addEth, compareEth, minEth, multiplyEth, percentOfEth, subtractEth } from '@/lib/eth'
import { commit, getDb, nextId, type CartRecord } from '../db'
import { errorResponse } from '../responses'
import { findEdition, findNft, maxQuantityFor } from './catalog'
import { resolveCoupon } from './coupons'

const QUOTES_KEPT_PER_CART = 5

export type QuoteDraft = Omit<Quote, 'id' | 'version' | 'cartId' | 'createdAt' | 'expiresAt'>

export function findNetwork(networkId: NetworkId): Network {
  const network = getDb().networks.find((record) => record.id === networkId)
  if (!network) {
    throw errorResponse(422, 'VALIDATION_ERROR', 'Rede desconhecida.', { network: 'Selecione uma rede válida.' })
  }
  return network
}

export function latestQuote(cartId: string): Quote | null {
  const records = getDb().quotes.filter((record) => record.quote.cartId === cartId)
  return records.length > 0 ? records[records.length - 1].quote : null
}

export function findQuote(quoteId: string): Quote | null {
  return getDb().quotes.find((record) => record.quote.id === quoteId)?.quote ?? null
}

function lineIssue(quantity: number, available: number, maxQuantity: number, priceChanged: boolean): QuoteLineIssue | null {
  if (available === 0) {
    return 'SOLD_OUT'
  }
  if (quantity > maxQuantity) {
    return 'INSUFFICIENT_AVAILABILITY'
  }
  return priceChanged ? 'PRICE_CHANGED' : null
}

export function draftQuote(cart: CartRecord, networkId: NetworkId): QuoteDraft {
  const network = findNetwork(networkId)
  const previous = latestQuote(cart.id)
  const lines: QuoteLine[] = cart.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft && findEdition(nft, item.editionId)
    if (!nft || !edition) {
      return []
    }
    const previousLine = previous?.lines.find((line) => line.cartItemId === item.id)
    const priceChanged = !!previousLine && compareEth(previousLine.unitPrice, edition.price) !== 0
    return [
      {
        cartItemId: item.id,
        nftId: nft.id,
        editionId: edition.id,
        name: nft.name,
        tokenId: nft.tokenId,
        image: structuredClone(nft.image),
        editionLabel: edition.label,
        quantity: item.quantity,
        unitPrice: edition.price,
        lineTotal: multiplyEth(edition.price, item.quantity),
        available: edition.available,
        nftVersion: nft.version,
        issue: lineIssue(item.quantity, edition.available, maxQuantityFor(edition), priceChanged),
        previousUnitPrice: priceChanged && previousLine ? previousLine.unitPrice : null,
      },
    ]
  })

  const resolution = cart.couponCode ? resolveCoupon(cart.couponCode) : null
  const coupon = resolution?.ok
    ? { code: resolution.coupon.code, percent: resolution.coupon.percent, label: resolution.coupon.label }
    : null
  const subtotal = addEth('0', ...lines.map((line) => line.lineTotal))
  const discount = coupon ? minEth(percentOfEth(subtotal, coupon.percent), subtotal) : '0'
  const networkFee = lines.length > 0 ? network.fee : '0'

  return {
    network: network.id,
    lines,
    coupon,
    couponError: resolution && !resolution.ok ? resolution.error : null,
    subtotal,
    discount,
    networkFee,
    networkFeeEstimated: network.feeEstimated,
    total: addEth(subtractEth(subtotal, discount), networkFee),
    purchasable: lines.length > 0 && lines.every((line) => line.issue === null || line.issue === 'PRICE_CHANGED'),
  }
}

function fingerprintOf(draft: QuoteDraft): string {
  return JSON.stringify({
    network: draft.network,
    fee: draft.networkFee,
    coupon: draft.coupon?.code ?? null,
    couponError: draft.couponError?.reason ?? null,
    lines: draft.lines.map((line) => [line.cartItemId, line.nftId, line.editionId, line.quantity, line.unitPrice, line.issue === 'SOLD_OUT' || line.issue === 'INSUFFICIENT_AVAILABILITY']),
  })
}

export function issueQuote(cart: CartRecord, networkId: NetworkId): Quote {
  const db = getDb()
  const draft = draftQuote(cart, networkId)
  const fingerprint = fingerprintOf(draft)
  if (fingerprint !== cart.lastQuoteFingerprint) {
    cart.quoteVersion += 1
    cart.lastQuoteFingerprint = fingerprint
  }
  const now = Date.now()
  const quote: Quote = {
    ...draft,
    id: nextId('quote'),
    version: cart.quoteVersion,
    cartId: cart.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_SECONDS * 1000).toISOString(),
  }
  const others = db.quotes.filter((record) => record.quote.cartId !== cart.id)
  const kept = db.quotes.filter((record) => record.quote.cartId === cart.id).slice(-(QUOTES_KEPT_PER_CART - 1))
  db.quotes = [...others, ...kept, { quote, fingerprint }]
  commit()
  return quote
}

export function diffQuote(stored: Quote, draft: QuoteDraft): QuoteChange[] {
  const changes: QuoteChange[] = []
  if (Date.parse(stored.expiresAt) <= Date.now()) {
    changes.push({ type: 'QUOTE_EXPIRED' })
  }
  if (stored.network !== draft.network) {
    changes.push({ type: 'NETWORK_CHANGED', previous: stored.network, current: draft.network })
  }
  const itemsKey = (lines: QuoteLine[]) =>
    lines
      .map((line) => `${line.cartItemId}:${line.quantity}`)
      .sort()
      .join('|')
  if (itemsKey(stored.lines) !== itemsKey(draft.lines)) {
    changes.push({ type: 'ITEMS_CHANGED' })
  }
  for (const line of draft.lines) {
    const previous = stored.lines.find((entry) => entry.cartItemId === line.cartItemId)
    if (previous && compareEth(previous.unitPrice, line.unitPrice) !== 0) {
      changes.push({ type: 'PRICE_CHANGED', nftId: line.nftId, editionId: line.editionId, previous: previous.unitPrice, current: line.unitPrice })
    }
    if (line.issue === 'SOLD_OUT' || line.issue === 'INSUFFICIENT_AVAILABILITY') {
      changes.push({ type: 'AVAILABILITY_CHANGED', nftId: line.nftId, editionId: line.editionId, requested: line.quantity, available: line.available })
    }
  }
  const storedCoupon = stored.coupon?.code ?? null
  const draftCoupon = draft.coupon?.code ?? null
  if (storedCoupon !== draftCoupon || (stored.couponError?.reason ?? null) !== (draft.couponError?.reason ?? null)) {
    changes.push({
      type: 'COUPON_CHANGED',
      previous: storedCoupon ?? stored.couponError?.code ?? null,
      current: draftCoupon ?? draft.couponError?.code ?? null,
      reason: draft.couponError?.reason ?? null,
    })
  }
  if (compareEth(stored.networkFee, draft.networkFee) !== 0) {
    changes.push({ type: 'NETWORK_FEE_CHANGED', previous: stored.networkFee, current: draft.networkFee })
  }
  return changes
}
