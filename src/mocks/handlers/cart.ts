import { GUEST_CART_ID_PATTERN, type AvailabilityIssue, type MergeCartResponse } from '@/api/contracts'
import { commit, getDb, nextId } from '../db'
import { COUPON_CODE_PATTERN } from '../fixtures/coupons'
import { errorResponse, jsonResponse } from '../responses'
import {
  availabilityConflict,
  availabilityIssue,
  findCart,
  getOrCreateCart,
  resolveCartOwner,
  toCart,
  touchCart,
} from '../services/carts'
import { findEdition, findNft, maxQuantityFor } from '../services/catalog'
import { normalizeCouponCode, resolveCoupon } from '../services/coupons'
import { apiRoute, readJsonBody, stringField } from './route'
import { authenticate } from './session-guard'
import { validateQuantity } from './validation'

function findNftAndEdition(nftId: string, editionId: string) {
  const nft = findNft(nftId)
  if (!nft) {
    throw errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
  }
  const edition = findEdition(nft, editionId)
  if (!edition) {
    throw errorResponse(404, 'NOT_FOUND', 'Edição não encontrada para este NFT.')
  }
  return { nft, edition }
}

function quantityError(value: unknown): Response | null {
  const message = validateQuantity(value)
  return message ? errorResponse(422, 'VALIDATION_ERROR', message, { quantity: message }) : null
}

const get = apiRoute('cart.get', async ({ request }) => {
  const cart = getOrCreateCart(await resolveCartOwner(request))
  return jsonResponse(toCart(cart))
})

const addItem = apiRoute('cart.addItem', async ({ request }) => {
  const owner = await resolveCartOwner(request)
  const body = await readJsonBody(request)
  const invalidQuantity = quantityError(body.quantity)
  if (invalidQuantity) {
    return invalidQuantity
  }
  const quantity = body.quantity as number
  const { nft, edition } = findNftAndEdition(stringField(body, 'nftId'), stringField(body, 'editionId'))
  const cart = getOrCreateCart(owner)
  const existing = cart.items.find((item) => item.nftId === nft.id && item.editionId === edition.id)
  const issue = availabilityIssue(nft, edition, (existing?.quantity ?? 0) + quantity, existing?.id ?? null)
  if (issue) {
    return availabilityConflict(issue, nft.name)
  }
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.items.push({ id: nextId('item'), nftId: nft.id, editionId: edition.id, quantity, addedAt: new Date().toISOString() })
  }
  touchCart(cart)
  return jsonResponse(toCart(cart))
})

const updateItem = apiRoute('cart.updateItem', async ({ request, params }) => {
  const owner = await resolveCartOwner(request)
  const body = await readJsonBody(request)
  const invalidQuantity = quantityError(body.quantity)
  if (invalidQuantity) {
    return invalidQuantity
  }
  const cart = getOrCreateCart(owner)
  const item = cart.items.find((entry) => entry.id === params.itemId)
  if (!item) {
    return errorResponse(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
  }
  const { nft, edition } = findNftAndEdition(item.nftId, item.editionId)
  const issue = availabilityIssue(nft, edition, body.quantity as number, item.id)
  if (issue) {
    return availabilityConflict(issue, nft.name)
  }
  item.quantity = body.quantity as number
  touchCart(cart)
  return jsonResponse(toCart(cart))
})

const removeItem = apiRoute('cart.removeItem', async ({ request, params }) => {
  const cart = getOrCreateCart(await resolveCartOwner(request))
  cart.items = cart.items.filter((item) => item.id !== params.itemId)
  touchCart(cart)
  return jsonResponse(toCart(cart))
})

const applyCoupon = apiRoute('cart.applyCoupon', async ({ request }) => {
  const owner = await resolveCartOwner(request)
  const body = await readJsonBody(request)
  const code = normalizeCouponCode(stringField(body, 'code'))
  if (!COUPON_CODE_PATTERN.test(code)) {
    const message = code ? 'Use de 4 a 20 letras ou números, sem espaços.' : 'Informe o código promocional.'
    return errorResponse(422, 'VALIDATION_ERROR', message, { code: message })
  }
  const resolution = resolveCoupon(code)
  if (!resolution.ok) {
    return errorResponse(422, resolution.error.reason, resolution.error.message, { code: resolution.error.message })
  }
  const cart = getOrCreateCart(owner)
  cart.couponCode = resolution.coupon.code
  touchCart(cart)
  return jsonResponse(toCart(cart))
})

const removeCoupon = apiRoute('cart.removeCoupon', async ({ request }) => {
  const cart = getOrCreateCart(await resolveCartOwner(request))
  cart.couponCode = null
  touchCart(cart)
  return jsonResponse(toCart(cart))
})

const merge = apiRoute('cart.merge', async ({ request }) => {
  const { user } = await authenticate(request)
  const body = await readJsonBody(request)
  const guestCartId = stringField(body, 'guestCartId')
  if (!GUEST_CART_ID_PATTERN.test(guestCartId)) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Identificador do carrinho de visitante inválido.', {
      guestCartId: 'Identificador do carrinho de visitante inválido.',
    })
  }
  const userCart = getOrCreateCart({ type: 'user', id: user.id })
  const guestCart = findCart({ type: 'guest', id: guestCartId })
  const adjustments: AvailabilityIssue[] = []

  if (guestCart) {
    for (const guestItem of guestCart.items) {
      const nft = findNft(guestItem.nftId)
      const edition = nft && findEdition(nft, guestItem.editionId)
      if (!nft || !edition) {
        continue
      }
      const existing = userCart.items.find((item) => item.nftId === nft.id && item.editionId === edition.id)
      const requested = (existing?.quantity ?? 0) + guestItem.quantity
      const issue = availabilityIssue(nft, edition, requested, existing?.id ?? null)
      const quantity = issue ? maxQuantityFor(edition) : requested
      if (issue) {
        adjustments.push(issue)
      }
      if (existing) {
        existing.quantity = quantity
      } else if (quantity > 0) {
        userCart.items.push({ id: nextId('item'), nftId: nft.id, editionId: edition.id, quantity, addedAt: guestItem.addedAt })
      }
    }
    userCart.items = userCart.items.filter((item) => item.quantity > 0)
    userCart.couponCode = userCart.couponCode ?? guestCart.couponCode
    const db = getDb()
    db.carts = db.carts.filter((cart) => cart.id !== guestCart.id)
    commit()
  }

  touchCart(userCart)
  const response: MergeCartResponse = { cart: toCart(userCart), adjustments }
  return jsonResponse(response)
})

export const cartHandlers = [get, addItem, updateItem, removeItem, applyCoupon, removeCoupon, merge]
