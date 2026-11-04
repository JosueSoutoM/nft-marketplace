import {
  ORDER_NOTE_MAX_LENGTH,
  type CreateOrderRequest,
  type FieldErrors,
  type NetworkId,
  type Profile,
  type Quote,
  type Wallet,
  type WalletType,
} from '@/api/contracts'
import { clearResumeDraft, readResumeDraft, saveResumeDraft } from './session-resume'
import {
  normalizeEmail,
  validateAddress,
  validateEmail,
  validateEnsName,
  validateReferralCode,
  validateSecondaryAddress,
  validateText,
  validateUsername,
} from './validation'

const DRAFT_KEY = 'checkout'
const ENS_SUFFIX = '.eth'

export const CHECKOUT_FIELDS = [
  'displayName',
  'username',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'walletType',
  'referralCode',
  'email',
  'ensName',
  'note',
  'wallet',
] as const

export type CheckoutField = (typeof CHECKOUT_FIELDS)[number]

export type CheckoutErrors = Partial<Record<CheckoutField, string>>

export const CHECKOUT_FIELD_LABELS: Record<CheckoutField, string> = {
  displayName: 'Nome de exibição',
  username: 'Nome de usuário',
  network: 'Rede',
  profileName: 'Nome do perfil',
  address: 'Endereço da carteira',
  secondaryAddress: 'ENS ou carteira secundária',
  walletType: 'Tipo de carteira',
  referralCode: 'Código de indicação',
  email: 'E-mail',
  ensName: 'Nome ENS',
  note: 'Observação do colecionador',
  wallet: 'Carteira',
}

export interface CheckoutValues {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
  note: string
  otherWalletType: WalletType | ''
  otherAddress: string
  otherSecondaryAddress: string
}

export type WalletChoice = { source: 'saved'; walletId: string } | { source: 'other' }

export interface OrderAttempt {
  key: string
  fingerprint: string
  request: CreateOrderRequest
  pending: boolean
}

export interface CheckoutDraft {
  values: CheckoutValues
  wallet: WalletChoice | null
  network: NetworkId | null
  attempt: OrderAttempt | null
}

const API_FIELDS: Record<string, CheckoutField> = {
  'collector.displayName': 'displayName',
  'collector.username': 'username',
  'collector.profileName': 'profileName',
  'collector.email': 'email',
  'collector.ensName': 'ensName',
  'collector.referralCode': 'referralCode',
  'payment.walletType': 'walletType',
  'payment.address': 'address',
  'payment.secondaryAddress': 'secondaryAddress',
  'payment.walletId': 'wallet',
  'payment.source': 'wallet',
  network: 'network',
  note: 'note',
}

function stripEns(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().toLowerCase()
  return trimmed.endsWith(ENS_SUFFIX) ? trimmed.slice(0, -ENS_SUFFIX.length) : trimmed
}

export function fullEnsName(value: string): string {
  const name = stripEns(value)
  return name ? `${name}${ENS_SUFFIX}` : ''
}

export function initialCheckoutValues(profile: Profile | undefined, wallet: Wallet | undefined): CheckoutValues {
  return {
    displayName: profile?.displayName ?? wallet?.displayName ?? '',
    username: profile?.username ?? '',
    profileName: wallet?.profileName ?? '',
    email: profile?.email ?? wallet?.email ?? '',
    ensName: stripEns(profile?.ensName ?? wallet?.ensName),
    referralCode: wallet?.referralCode ?? '',
    note: '',
    otherWalletType: '',
    otherAddress: '',
    otherSecondaryAddress: '',
  }
}

interface ValidationContext {
  values: CheckoutValues
  wallet: WalletChoice | null
  network: NetworkId | null
  savedWallet: Wallet | undefined
  connected: boolean
  networkLabel: string | null
}

export function validateCheckout({ values, wallet, network, savedWallet, connected, networkLabel }: ValidationContext): CheckoutErrors {
  const other = wallet?.source === 'other'
  const errors: Record<CheckoutField, string | null> = {
    displayName: validateText(values.displayName.trim(), 'o nome de exibição', 2, 50),
    username: validateUsername(values.username.trim()),
    network: network ? null : 'Selecione uma rede.',
    profileName: validateText(values.profileName.trim(), 'o nome do perfil', 2, 50),
    address: other ? validateAddress(network, values.otherAddress.trim()) : null,
    secondaryAddress: other ? validateSecondaryAddress(network, values.otherSecondaryAddress.trim() || null) : null,
    walletType: other && !values.otherWalletType ? 'Selecione o tipo de carteira.' : null,
    referralCode: validateReferralCode(values.referralCode.trim()),
    email: validateEmail(normalizeEmail(values.email)),
    ensName: validateEnsName(fullEnsName(values.ensName)),
    note: values.note.trim().length > ORDER_NOTE_MAX_LENGTH ? `A observação aceita até ${ORDER_NOTE_MAX_LENGTH} caracteres.` : null,
    wallet: null,
  }
  if (!wallet) {
    errors.wallet = 'Selecione uma carteira cadastrada ou use outra carteira.'
  } else if (wallet.source === 'saved' && !savedWallet) {
    errors.wallet = 'Selecione uma carteira cadastrada.'
  } else if (wallet.source === 'saved' && network && !connected) {
    errors.wallet = `Conecte a carteira na rede ${networkLabel ?? network} para continuar.`
  }
  return Object.fromEntries(Object.entries(errors).filter((entry) => entry[1] !== null)) as CheckoutErrors
}

export function toCheckoutErrors(fieldErrors: FieldErrors): CheckoutErrors {
  const errors: CheckoutErrors = {}
  for (const [key, message] of Object.entries(fieldErrors)) {
    const field = API_FIELDS[key]
    if (field && !errors[field]) {
      errors[field] = message
    }
  }
  return errors
}

export function buildOrderRequest(values: CheckoutValues, wallet: WalletChoice, network: NetworkId, quote: Quote): CreateOrderRequest {
  const note = values.note.trim()
  return {
    quoteId: quote.id,
    quoteVersion: quote.version,
    network,
    collector: {
      displayName: values.displayName.trim(),
      username: values.username.trim(),
      profileName: values.profileName.trim(),
      email: normalizeEmail(values.email),
      ensName: fullEnsName(values.ensName),
      referralCode: values.referralCode.trim(),
    },
    payment:
      wallet.source === 'saved'
        ? { source: 'saved', walletId: wallet.walletId }
        : {
            source: 'other',
            walletType: values.otherWalletType as WalletType,
            address: values.otherAddress.trim(),
            secondaryAddress: values.otherSecondaryAddress.trim() || null,
          },
    note: note || null,
  }
}

export function readCheckoutDraft(userId: string): CheckoutDraft | null {
  return readResumeDraft<CheckoutDraft>(DRAFT_KEY, userId)
}

export function saveCheckoutDraft(userId: string, draft: CheckoutDraft): void {
  saveResumeDraft(DRAFT_KEY, userId, draft)
}

export function clearCheckoutDraft(): void {
  clearResumeDraft(DRAFT_KEY)
}
