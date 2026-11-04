import {
  GUEST_CART_HEADER,
  GUEST_CART_ID_PATTERN,
  type AvailabilityIssue,
  type Cart,
  type CartItem,
  type Nft,
  type NftEdition,
} from '@/api/contracts'
import { addEth, multiplyEth } from '@/lib/eth'
import { commit, getDb, nextId, type CartRecord } from '../db'
import { authenticate, readBearerToken } from '../handlers/session-guard'
import { errorResponse } from '../responses'
import { findEdition, findNft, maxQuantityFor } from './catalog'

export type CartOwner = { type: 'guest' | 'user'; id: string }

export async function resolveCartOwner(request: Request): Promise<CartOwner> {
  if (readBearerToken(request)) {
    const { user } = await authenticate(request)
    return { type: 'user', id: user.id }
  }
  const guestId = request.headers.get(GUEST_CART_HEADER)
  if (!guestId || !GUEST_CART_ID_PATTERN.test(guestId)) {
    throw errorResponse(400, 'BAD_REQUEST', `Informe o header ${GUEST_CART_HEADER} ou entre na sua conta.`, {
      [GUEST_CART_HEADER]: 'Identificador do carrinho ausente ou inválido.',
    })
  }
  return { type: 'guest', id: guestId }
}

export function findCart(owner: CartOwner): CartRecord | null {
  return getDb().carts.find((cart) => cart.ownerType === owner.type && cart.ownerId === owner.id) ?? null
}

export function getOrCreateCart(owner: CartOwner): CartRecord {
  const existing = findCart(owner)
  if (existing) {
    return existing
  }
  const cart: CartRecord = {
    id: nextId('cart'),
    ownerType: owner.type,
    ownerId: owner.id,
    items: [],
    couponCode: null,
    quoteVersion: 0,
    lastQuoteFingerprint: null,
    updatedAt: new Date().toISOString(),
  }
  getDb().carts.push(cart)
  commit()
  return cart
}

export function touchCart(cart: CartRecord): void {
  cart.updatedAt = new Date().toISOString()
  commit()
}

export function toCart(record: CartRecord): Cart {
  const items: CartItem[] = record.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft && findEdition(nft, item.editionId)
    if (!nft || !edition) {
      return []
    }
    return [
      {
        id: item.id,
        nftId: nft.id,
        editionId: edition.id,
        quantity: item.quantity,
        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        editionLabel: edition.label,
        editionKind: edition.kind,
        unitPrice: edition.price,
        lineTotal: multiplyEth(edition.price, item.quantity),
        available: edition.available,
        maxQuantity: maxQuantityFor(edition),
        nftVersion: nft.version,
      },
    ]
  })
  return {
    id: record.id,
    owner: record.ownerType,
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    couponCode: record.couponCode,
    subtotal: addEth('0', ...items.map((item) => item.lineTotal)),
    updatedAt: record.updatedAt,
  }
}

export function availabilityIssue(
  nft: Nft,
  edition: NftEdition,
  requested: number,
  cartItemId: string | null,
): AvailabilityIssue | null {
  const maxQuantity = maxQuantityFor(edition)
  if (requested <= maxQuantity) {
    return null
  }
  return {
    nftId: nft.id,
    editionId: edition.id,
    cartItemId,
    requested,
    available: edition.available,
    maxQuantity,
    reason: edition.available < edition.maxPerOrder ? 'STOCK' : 'ORDER_LIMIT',
  }
}

export function availabilityConflict(issue: AvailabilityIssue, name: string): Response {
  const message =
    issue.maxQuantity === 0
      ? `${name}: esta edição está esgotada.`
      : issue.reason === 'STOCK'
        ? `${name}: apenas ${issue.maxQuantity} ${issue.maxQuantity === 1 ? 'unidade disponível' : 'unidades disponíveis'} nesta edição.`
        : `${name}: limite de ${issue.maxQuantity} por pedido nesta edição.`
  return errorResponse(409, 'AVAILABILITY_CONFLICT', message, { quantity: message }, { availability: [issue] })
}

export function removePurchasedItems(
  userId: string,
  lines: Array<{ nftId: string; editionId: string; quantity: number }>,
  couponCode: string | null,
): void {
  const cart = findCart({ type: 'user', id: userId })
  if (!cart) {
    return
  }
  if (couponCode !== null && cart.couponCode === couponCode) {
    cart.couponCode = null
  }
  for (const line of lines) {
    const item = cart.items.find((entry) => entry.nftId === line.nftId && entry.editionId === line.editionId)
    if (item) {
      item.quantity -= line.quantity
    }
  }
  cart.items = cart.items.filter((item) => item.quantity > 0)
  touchCart(cart)
}
