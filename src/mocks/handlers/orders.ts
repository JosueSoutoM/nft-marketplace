import { delay } from 'msw'
import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_KEY_PATTERN,
  NETWORK_IDS,
  ORDER_NOTE_MAX_LENGTH,
  ORDER_STATUSES,
  WALLET_TYPES,
  type AvailabilityIssue,
  type CollectorDetails,
  type CreateOrderRequest,
  type FieldErrors,
  type NetworkId,
  type Order,
  type OrderListResponse,
  type OrderReceipt,
  type OrderStatus,
  type PaymentWallet,
  type Quote,
  type QuoteChange,
  type WalletType,
} from '@/api/contracts'
import { percentOfEth } from '@/lib/eth'
import { publishOrderUpdated } from '../changes'
import { commit, getDb, nextId, type OrderRecord, type UserRecord } from '../db'
import { walletTypeLabels } from '../fixtures/wallet-types'
import { errorResponse, jsonResponse } from '../responses'
import {
  ORDER_TIMEOUT_DELAY_MS,
  PAYMENT_SETTLE_DELAY_MS,
  consumeScenarioEffect,
  isScenario,
} from '../scenarios'
import { findCart } from '../services/carts'
import { findEdition, findNft, maxQuantityFor, updateNftEditions } from '../services/catalog'
import { findOrderRecord, scheduleSettlement, settleIfOverdue } from '../services/orders'
import { diffQuote, draftQuote, findQuote, issueQuote } from '../services/quotes'
import { apiRoute, readJsonBody } from './route'
import { authenticate } from './session-guard'
import {
  asRecord,
  collectErrors,
  normalizeEmail,
  optionalString,
  stableStringify,
  trimmedString,
  validateAddress,
  validateEmail,
  validateEnsName,
  validateReferralCode,
  validateSecondaryAddress,
  validateText,
  validateUsername,
} from './validation'

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

function parseCollector(value: unknown): { collector: CollectorDetails; errors: Record<string, string | null> } {
  const raw = asRecord(value)
  const collector: CollectorDetails = {
    displayName: trimmedString(raw.displayName),
    username: trimmedString(raw.username),
    profileName: trimmedString(raw.profileName),
    email: normalizeEmail(trimmedString(raw.email)),
    ensName: trimmedString(raw.ensName),
    referralCode: trimmedString(raw.referralCode),
  }
  return {
    collector,
    errors: {
      'collector.displayName': validateText(collector.displayName, 'o nome de exibição', 2, 50),
      'collector.username': validateUsername(collector.username),
      'collector.profileName': validateText(collector.profileName, 'o nome do perfil', 2, 50),
      'collector.email': validateEmail(collector.email),
      'collector.ensName': validateEnsName(collector.ensName),
      'collector.referralCode': validateReferralCode(collector.referralCode),
    },
  }
}

function parsePayment(value: unknown, network: NetworkId | null): { payment: PaymentWallet; errors: Record<string, string | null> } {
  const raw = asRecord(value)
  if (raw.source === 'saved') {
    const walletId = trimmedString(raw.walletId)
    return {
      payment: { source: 'saved', walletId },
      errors: { 'payment.walletId': walletId ? null : 'Selecione uma carteira cadastrada.' },
    }
  }
  const walletType = includes(WALLET_TYPES, raw.walletType) ? raw.walletType : null
  const address = trimmedString(raw.address)
  const secondaryAddress = optionalString(raw.secondaryAddress)
  return {
    payment: { source: 'other', walletType: walletType ?? ('' as WalletType), address, secondaryAddress },
    errors: {
      'payment.source': raw.source === 'other' ? null : 'Escolha entre uma carteira cadastrada ou outra carteira.',
      'payment.walletType': walletType ? null : 'Selecione o tipo de carteira.',
      'payment.address': validateAddress(network, address),
      'payment.secondaryAddress': validateSecondaryAddress(network, secondaryAddress),
    },
  }
}

function parseCreateOrder(body: Record<string, unknown>): { request: CreateOrderRequest } | { errors: FieldErrors } {
  const network = includes(NETWORK_IDS, body.network) ? body.network : null
  const quoteId = trimmedString(body.quoteId)
  const quoteVersion = body.quoteVersion
  const note = optionalString(body.note)
  const { collector, errors: collectorErrors } = parseCollector(body.collector)
  const { payment, errors: paymentErrors } = parsePayment(body.payment, network)
  const errors = collectErrors({
    quoteId: quoteId ? null : 'Informe a cotação.',
    quoteVersion: typeof quoteVersion === 'number' && Number.isInteger(quoteVersion) && quoteVersion >= 1 ? null : 'Versão da cotação inválida.',
    network: network ? null : 'Selecione uma rede.',
    note: note && note.length > ORDER_NOTE_MAX_LENGTH ? `A observação aceita até ${ORDER_NOTE_MAX_LENGTH} caracteres.` : null,
    ...collectorErrors,
    ...paymentErrors,
  })
  if (errors) {
    return { errors }
  }
  return {
    request: { quoteId, quoteVersion: quoteVersion as number, network: network as NetworkId, collector, payment, note },
  }
}

function resolveWallet(user: UserRecord, request: CreateOrderRequest): OrderReceipt['wallet'] {
  const { payment } = request
  if (payment.source === 'other') {
    return { walletType: payment.walletType, address: payment.address, label: walletTypeLabels[payment.walletType] }
  }
  const db = getDb()
  const wallet = db.wallets.find((record) => record.id === payment.walletId && record.userId === user.id)
  if (!wallet) {
    throw errorResponse(422, 'VALIDATION_ERROR', 'Carteira não encontrada.', { 'payment.walletId': 'Selecione uma carteira cadastrada.' })
  }
  const connection = db.walletConnections.find((record) => record.userId === user.id && record.walletId === wallet.id)
  if (!connection || connection.status !== 'connected') {
    throw errorResponse(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar a compra.')
  }
  if (connection.network !== request.network) {
    throw errorResponse(409, 'WALLET_NOT_CONNECTED', 'A carteira está conectada em outra rede. Conecte-a novamente na rede escolhida.')
  }
  return { walletType: wallet.walletType, address: wallet.address, label: walletTypeLabels[wallet.walletType] }
}

function applyPurchaseScenario(quote: Quote): void {
  const line = quote.lines[0]
  const nft = line && findNft(line.nftId)
  const edition = nft && findEdition(nft, line.editionId)
  if (!nft || !edition) {
    return
  }
  if (consumeScenarioEffect('price-changed')) {
    updateNftEditions(nft.id, [{ editionId: edition.id, price: percentOfEth(edition.price, '110') }])
  }
  if (consumeScenarioEffect('edition-sold-out')) {
    updateNftEditions(nft.id, [{ editionId: edition.id, available: 0 }])
  }
}

function availabilityIssues(quote: Quote): AvailabilityIssue[] {
  return quote.lines.flatMap((line) => {
    if (line.issue !== 'SOLD_OUT' && line.issue !== 'INSUFFICIENT_AVAILABILITY') {
      return []
    }
    const nft = findNft(line.nftId)
    const edition = nft && findEdition(nft, line.editionId)
    const maxQuantity = edition ? maxQuantityFor(edition) : 0
    return [
      {
        nftId: line.nftId,
        editionId: line.editionId,
        cartItemId: line.cartItemId,
        requested: line.quantity,
        available: line.available,
        maxQuantity,
        reason: edition && edition.available < edition.maxPerOrder ? 'STOCK' : 'ORDER_LIMIT',
      } satisfies AvailabilityIssue,
    ]
  })
}

function buildReceipt(quote: Quote, request: CreateOrderRequest, wallet: OrderReceipt['wallet']): OrderReceipt {
  return structuredClone({
    quoteId: quote.id,
    quoteVersion: quote.version,
    lines: quote.lines.map((line) => ({
      nftId: line.nftId,
      editionId: line.editionId,
      name: line.name,
      tokenId: line.tokenId,
      image: line.image,
      editionLabel: line.editionLabel,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    couponCode: quote.coupon?.code ?? null,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    network: quote.network,
    wallet,
    collector: request.collector,
    note: request.note,
  })
}

const create = apiRoute('orders.create', async ({ request }) => {
  const { user } = await authenticate(request)
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER)
  if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return errorResponse(400, 'BAD_REQUEST', `O header ${IDEMPOTENCY_HEADER} é obrigatório (8 a 128 caracteres).`, {
      [IDEMPOTENCY_HEADER]: 'Chave de idempotência ausente ou inválida.',
    })
  }
  const parsed = parseCreateOrder(await readJsonBody(request))
  if ('errors' in parsed) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', parsed.errors)
  }
  if (isScenario('form-validation')) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
      'collector.referralCode': 'Código de indicação não reconhecido pelo programa de indicações.',
    })
  }
  const orderRequest = parsed.request
  const requestFingerprint = stableStringify(orderRequest)
  const db = getDb()

  const existing = db.orders.find((record) => record.userId === user.id && record.idempotencyKey === idempotencyKey)
  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) {
      return errorResponse(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada com outro conteúdo.')
    }
    settleIfOverdue(existing)
    return jsonResponse(existing.order, 200, { 'Idempotent-Replayed': 'true' })
  }

  const cart = findCart({ type: 'user', id: user.id })
  if (!cart || cart.items.length === 0) {
    return errorResponse(422, 'CART_EMPTY', 'Seu carrinho está vazio.')
  }
  const storedQuote = findQuote(orderRequest.quoteId)
  if (!storedQuote) {
    return errorResponse(404, 'NOT_FOUND', 'Cotação não encontrada. Gere uma nova cotação.')
  }
  const wallet = resolveWallet(user, orderRequest)

  if (storedQuote.cartId !== cart.id) {
    const currentQuote = issueQuote(cart, orderRequest.network)
    return errorResponse(409, 'QUOTE_OUTDATED', 'A cotação não corresponde ao seu carrinho atual. Revise e confirme novamente.', undefined, {
      quoteChanges: [{ type: 'ITEMS_CHANGED' }],
      currentQuote,
    })
  }

  applyPurchaseScenario(storedQuote)
  const draft = draftQuote(cart, orderRequest.network)
  const changes: QuoteChange[] = [
    ...(orderRequest.quoteVersion !== storedQuote.version
      ? [{ type: 'QUOTE_VERSION_MISMATCH' as const, sent: orderRequest.quoteVersion, current: storedQuote.version }]
      : []),
    ...diffQuote(storedQuote, draft),
  ]

  if (!draft.purchasable) {
    const currentQuote = issueQuote(cart, orderRequest.network)
    return errorResponse(409, 'AVAILABILITY_CONFLICT', 'Um ou mais itens não estão mais disponíveis na quantidade escolhida.', undefined, {
      availability: availabilityIssues(currentQuote),
      quoteChanges: changes,
      currentQuote,
    })
  }
  if (changes.length > 0) {
    const currentQuote = issueQuote(cart, orderRequest.network)
    return errorResponse(409, 'QUOTE_OUTDATED', 'Os valores da compra mudaram. Revise a nova cotação e confirme novamente.', undefined, {
      quoteChanges: changes,
      currentQuote,
    })
  }

  const now = new Date()
  const order: Order = {
    id: nextId('order'),
    status: 'pending',
    version: 1,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    receipt: buildReceipt(storedQuote, orderRequest, wallet),
    transaction: null,
    decline: null,
  }
  const record: OrderRecord = {
    userId: user.id,
    idempotencyKey,
    requestFingerprint,
    plannedOutcome: isScenario('payment-declined') ? 'declined' : 'confirmed',
    settleAt: new Date(now.getTime() + PAYMENT_SETTLE_DELAY_MS).toISOString(),
    order,
  }
  db.orders.push(record)
  commit()
  publishOrderUpdated(order, user.id)
  scheduleSettlement(record)

  if (isScenario('order-timeout')) {
    await delay(ORDER_TIMEOUT_DELAY_MS)
  }
  return jsonResponse(findOrderRecord(order.id)?.order ?? order, 201)
})

const list = apiRoute('orders.list', async ({ request }) => {
  const { user } = await authenticate(request)
  const status = new URL(request.url).searchParams.get('status')
  if (status !== null && !includes(ORDER_STATUSES, status)) {
    return errorResponse(400, 'BAD_REQUEST', 'Parâmetros de consulta inválidos.', { status: 'Status desconhecido.' })
  }
  const records = getDb().orders.filter((record) => record.userId === user.id)
  records.forEach(settleIfOverdue)
  const body: OrderListResponse = {
    items: records
      .map((record) => record.order)
      .filter((order) => status === null || order.status === (status as OrderStatus))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
  }
  return jsonResponse(body)
})

const get = apiRoute('orders.get', async ({ request, params }) => {
  const { user } = await authenticate(request)
  const record = findOrderRecord(params.orderId)
  if (!record || record.userId !== user.id) {
    return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.')
  }
  settleIfOverdue(record)
  return jsonResponse(record.order)
})

export const orderHandlers = [create, list, get]
