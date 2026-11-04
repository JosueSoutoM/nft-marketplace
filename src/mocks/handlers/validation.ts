import type { FieldErrors } from '@/api/contracts'

export {
  isAddressForNetwork,
  normalizeEmail,
  validateAddress,
  validateEnsName,
  validateReferralCode,
  validateSecondaryAddress,
  validateText,
  validateEmail,
  validateNewPassword,
  validatePasswordConfirmation,
  validateUsername,
} from '@/lib/validation'
export { stableStringify } from '@/lib/stable-stringify'

const MAX_CART_QUANTITY = 1000

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
