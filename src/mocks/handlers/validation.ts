import {
  ENS_NAME_PATTERN,
  EVM_ADDRESS_PATTERN,
  REFERRAL_CODE_PATTERN,
  SOLANA_ADDRESS_PATTERN,
  type FieldErrors,
  type NetworkId,
} from '@/api/contracts'

export {
  normalizeEmail,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateUsername,
} from '@/lib/validation'

const MAX_CART_QUANTITY = 1000

export function validateText(value: string, label: string, min: number, max: number): string | null {
  if (!value) {
    return `Informe ${label}.`
  }
  if (value.length < min || value.length > max) {
    return `${label[0].toUpperCase()}${label.slice(1)} deve ter entre ${min} e ${max} caracteres.`
  }
  return null
}

export function validateEnsName(value: string): string | null {
  if (!value) {
    return 'Informe o nome ENS.'
  }
  return ENS_NAME_PATTERN.test(value) ? null : 'Use de 3 a 63 letras minúsculas, números ou hífen, terminando em .eth.'
}

export function validateReferralCode(value: string): string | null {
  if (!value) {
    return 'Informe o código de indicação.'
  }
  return REFERRAL_CODE_PATTERN.test(value) ? null : 'Use de 4 a 12 letras maiúsculas ou números.'
}

export function isAddressForNetwork(network: NetworkId, address: string): boolean {
  return network === 'solana' ? SOLANA_ADDRESS_PATTERN.test(address) : EVM_ADDRESS_PATTERN.test(address)
}

export function validateAddress(network: NetworkId | null, address: string): string | null {
  if (!address) {
    return 'Informe o endereço da carteira.'
  }
  if (!network) {
    return null
  }
  if (isAddressForNetwork(network, address)) {
    return null
  }
  return network === 'solana'
    ? 'Endereço Solana inválido: use de 32 a 44 caracteres base58.'
    : 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
}

export function validateSecondaryAddress(network: NetworkId | null, value: string | null): string | null {
  if (!value) {
    return null
  }
  if (ENS_NAME_PATTERN.test(value) || (network !== null && isAddressForNetwork(network, value))) {
    return null
  }
  return 'Informe um nome ENS (.eth) ou um endereço válido para a rede selecionada.'
}

export function validateQuantity(value: unknown): string | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_CART_QUANTITY
    ? null
    : 'Informe uma quantidade inteira maior que zero.'
}

export function collectErrors(entries: Record<string, string | null>): FieldErrors | null {
  const errors = Object.fromEntries(Object.entries(entries).filter((entry): entry is [string, string] => entry[1] !== null))
  return Object.keys(errors).length > 0 ? errors : null
}

export function optionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
