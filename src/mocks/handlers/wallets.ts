import {
  NETWORK_IDS,
  WALLET_SLOTS,
  WALLET_TYPES,
  type NetworkId,
  type Wallet,
  type WalletConnection,
  type WalletDetails,
  type WalletListResponse,
  type WalletSlot,
} from '@/api/contracts'
import { commit, getDb, nextId, type WalletConnectionRecord, type WalletRecord } from '../db'
import { errorResponse, jsonResponse } from '../responses'
import { isScenario } from '../scenarios'
import { apiRoute, readJsonBody, stringField } from './route'
import { authenticate } from './session-guard'
import {
  collectErrors,
  normalizeEmail,
  optionalString,
  trimmedString,
  validateAddress,
  validateEmail,
  validateEnsName,
  validateReferralCode,
  validateSecondaryAddress,
  validateText,
} from './validation'

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

function toConnection(record: WalletConnectionRecord): WalletConnection {
  return { walletId: record.walletId, status: record.status, network: record.network, updatedAt: record.updatedAt }
}

function toWallet(record: WalletRecord): Wallet {
  const { userId, ...wallet } = record
  const connection = getDb().walletConnections.find((entry) => entry.userId === userId && entry.walletId === record.id)
  return { ...wallet, connection: connection ? toConnection(connection) : null }
}

function userWallets(userId: string): WalletRecord[] {
  return getDb()
    .wallets.filter((record) => record.userId === userId)
    .sort((left, right) => WALLET_SLOTS.indexOf(left.slot) - WALLET_SLOTS.indexOf(right.slot))
}

function detailsOf(record: WalletRecord): WalletDetails {
  const { displayName, nickname, network, profileName, address, secondaryAddress, walletType, referralCode, email, ensName } = record
  return { displayName, nickname, network, profileName, address, secondaryAddress, walletType, referralCode, email, ensName }
}

function parseDetails(body: Record<string, unknown>): { details: WalletDetails } | { errors: Record<string, string> } {
  const network = includes(NETWORK_IDS, body.network) ? body.network : null
  const walletType = includes(WALLET_TYPES, body.walletType) ? body.walletType : null
  const details = {
    displayName: trimmedString(body.displayName),
    nickname: trimmedString(body.nickname),
    network: network as NetworkId,
    profileName: trimmedString(body.profileName),
    address: trimmedString(body.address),
    secondaryAddress: optionalString(body.secondaryAddress),
    walletType: walletType as WalletDetails['walletType'],
    referralCode: trimmedString(body.referralCode),
    email: normalizeEmail(trimmedString(body.email)),
    ensName: trimmedString(body.ensName),
  }
  const errors = collectErrors({
    displayName: validateText(details.displayName, 'o nome de exibição', 2, 50),
    nickname: validateText(details.nickname, 'o apelido da carteira', 2, 40),
    network: network ? null : 'Selecione uma rede.',
    profileName: validateText(details.profileName, 'o nome do perfil', 2, 50),
    address: validateAddress(network, details.address),
    secondaryAddress: validateSecondaryAddress(network, details.secondaryAddress),
    walletType: walletType ? null : 'Selecione o tipo de carteira.',
    referralCode: validateReferralCode(details.referralCode),
    email: validateEmail(details.email),
    ensName: validateEnsName(details.ensName),
  })
  return errors ? { errors } : { details }
}

function dropConnection(userId: string, walletId: string): void {
  const db = getDb()
  db.walletConnections = db.walletConnections.filter((entry) => !(entry.userId === userId && entry.walletId === walletId))
}

function saveWallet(userId: string, slot: WalletSlot, details: WalletDetails, sameAsPrimary: boolean): { wallet: WalletRecord; created: boolean } {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = db.wallets.find((record) => record.userId === userId && record.slot === slot)
  if (existing) {
    if (existing.address !== details.address || existing.network !== details.network) {
      dropConnection(userId, existing.id)
    }
    Object.assign(existing, details, { sameAsPrimary, updatedAt: now })
    return { wallet: existing, created: false }
  }
  const wallet: WalletRecord = { ...details, id: nextId('wallet'), userId, slot, sameAsPrimary, createdAt: now, updatedAt: now }
  db.wallets.push(wallet)
  return { wallet, created: true }
}

function findUserWallet(userId: string, walletId: string): WalletRecord {
  const wallet = getDb().wallets.find((record) => record.id === walletId && record.userId === userId)
  if (!wallet) {
    throw errorResponse(404, 'NOT_FOUND', 'Carteira não encontrada.')
  }
  return wallet
}

const list = apiRoute('wallets.list', async ({ request }) => {
  const { user } = await authenticate(request)
  const body: WalletListResponse = { items: userWallets(user.id).map(toWallet) }
  return jsonResponse(body)
})

const upsert = apiRoute('wallets.upsert', async ({ request, params }) => {
  const { user } = await authenticate(request)
  if (!includes(WALLET_SLOTS, params.slot)) {
    return errorResponse(404, 'NOT_FOUND', 'Tipo de carteira inexistente. Use primary ou secondary.')
  }
  const slot = params.slot
  const body = await readJsonBody(request)
  const primary = userWallets(user.id).find((record) => record.slot === 'primary')

  if (body.sameAsPrimary === true) {
    if (slot === 'primary') {
      return errorResponse(422, 'VALIDATION_ERROR', 'A carteira principal não pode copiar a si mesma.', {
        sameAsPrimary: 'Opção disponível apenas para a carteira secundária.',
      })
    }
    if (!primary) {
      return errorResponse(422, 'VALIDATION_ERROR', 'Cadastre a carteira principal primeiro.', {
        sameAsPrimary: 'Cadastre a carteira principal primeiro.',
      })
    }
    const { wallet, created } = saveWallet(user.id, 'secondary', detailsOf(primary), true)
    commit()
    return jsonResponse(toWallet(wallet), created ? 201 : 200)
  }

  const parsed = parseDetails(body)
  if ('errors' in parsed) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', parsed.errors)
  }
  if (isScenario('form-validation')) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
      address: 'Endereço não reconhecido na rede selecionada.',
    })
  }
  if (slot === 'secondary' && !primary) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Cadastre a carteira principal primeiro.')
  }

  const { wallet, created } = saveWallet(user.id, slot, parsed.details, false)
  if (slot === 'primary') {
    const secondary = userWallets(user.id).find((record) => record.slot === 'secondary' && record.sameAsPrimary)
    if (secondary) {
      saveWallet(user.id, 'secondary', parsed.details, true)
    }
  }
  commit()
  return jsonResponse(toWallet(wallet), created ? 201 : 200)
})

function setConnection(userId: string, walletId: string, network: NetworkId, status: WalletConnectionRecord['status']): WalletConnection {
  const db = getDb()
  dropConnection(userId, walletId)
  const record: WalletConnectionRecord = { userId, walletId, network, status, updatedAt: new Date().toISOString() }
  db.walletConnections.push(record)
  commit()
  return toConnection(record)
}

const connect = apiRoute('wallets.connect', async ({ request, params }) => {
  const { user } = await authenticate(request)
  const wallet = findUserWallet(user.id, params.walletId)
  const body = await readJsonBody(request)
  const network = stringField(body, 'network')
  if (!includes(NETWORK_IDS, network)) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma rede válida.', { network: 'Selecione uma rede válida.' })
  }
  return jsonResponse(setConnection(user.id, wallet.id, network, 'connected'))
})

const disconnect = apiRoute('wallets.disconnect', async ({ request, params }) => {
  const { user } = await authenticate(request)
  const wallet = findUserWallet(user.id, params.walletId)
  const current = getDb().walletConnections.find((entry) => entry.userId === user.id && entry.walletId === wallet.id)
  return jsonResponse(setConnection(user.id, wallet.id, current?.network ?? wallet.network, 'disconnected'))
})

export function clearWalletConnections(userId: string): void {
  const db = getDb()
  db.walletConnections = db.walletConnections.filter((entry) => entry.userId !== userId)
  commit()
}

export const walletHandlers = [list, upsert, connect, disconnect]
