export type EthAmount = string

export const ETH_DECIMALS = 18

const WEI_PER_ETH = 10n ** BigInt(ETH_DECIMALS)
const ETH_PATTERN = /^-?\d+(\.\d+)?$/
const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/
const BASIS_POINTS = 10_000n

export interface FormatEthOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  unit?: boolean
}

export function isEthAmount(value: unknown): value is EthAmount {
  if (typeof value !== 'string' || !ETH_PATTERN.test(value)) {
    return false
  }
  const fraction = value.split('.')[1]
  return fraction === undefined || fraction.length <= ETH_DECIMALS
}

export function toWei(value: EthAmount): bigint {
  if (!isEthAmount(value)) {
    throw new RangeError(`Invalid ETH amount: ${value}`)
  }
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const wei = BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
  return negative ? -wei : wei
}

export function fromWei(wei: bigint): EthAmount {
  const negative = wei < 0n
  const absolute = negative ? -wei : wei
  const whole = absolute / WEI_PER_ETH
  const fraction = (absolute % WEI_PER_ETH).toString().padStart(ETH_DECIMALS, '0').replace(/0+$/, '')
  const text = fraction ? `${whole}.${fraction}` : whole.toString()
  return negative ? `-${text}` : text
}

export function normalizeEth(value: EthAmount): EthAmount {
  return fromWei(toWei(value))
}

export function parseEthInput(input: string): EthAmount | null {
  const candidate = input.trim().replace(',', '.')
  const normalized = candidate.startsWith('.') ? `0${candidate}` : candidate
  return isEthAmount(normalized) && !normalized.startsWith('-') ? normalizeEth(normalized) : null
}

export function addEth(...values: EthAmount[]): EthAmount {
  return fromWei(values.reduce((total, value) => total + toWei(value), 0n))
}

export function subtractEth(minuend: EthAmount, subtrahend: EthAmount): EthAmount {
  return fromWei(toWei(minuend) - toWei(subtrahend))
}

export function multiplyEth(value: EthAmount, quantity: number): EthAmount {
  if (!Number.isSafeInteger(quantity)) {
    throw new RangeError(`Quantity must be an integer: ${quantity}`)
  }
  return fromWei(toWei(value) * BigInt(quantity))
}

export function percentOfEth(value: EthAmount, percent: string): EthAmount {
  if (!PERCENT_PATTERN.test(percent)) {
    throw new RangeError(`Invalid percent: ${percent}`)
  }
  const [whole, fraction = ''] = percent.split('.')
  const basisPoints = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  const wei = toWei(value)
  const sign = wei < 0n ? -1n : 1n
  const absolute = wei * sign
  return fromWei(sign * ((absolute * basisPoints + BASIS_POINTS / 2n) / BASIS_POINTS))
}

export function compareEth(left: EthAmount, right: EthAmount): -1 | 0 | 1 {
  const difference = toWei(left) - toWei(right)
  if (difference === 0n) {
    return 0
  }
  return difference > 0n ? 1 : -1
}

export function isZeroEth(value: EthAmount): boolean {
  return toWei(value) === 0n
}

export function minEth(left: EthAmount, right: EthAmount): EthAmount {
  return compareEth(left, right) <= 0 ? normalizeEth(left) : normalizeEth(right)
}

export function maxEth(left: EthAmount, right: EthAmount): EthAmount {
  return compareEth(left, right) >= 0 ? normalizeEth(left) : normalizeEth(right)
}

function roundWei(wei: bigint, fractionDigits: number): bigint {
  const step = 10n ** BigInt(ETH_DECIMALS - fractionDigits)
  const sign = wei < 0n ? -1n : 1n
  const absolute = wei * sign
  return sign * (((absolute + step / 2n) / step) * step)
}

export function formatEth(value: EthAmount, options: FormatEthOptions = {}): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = ETH_DECIMALS, unit = true } = options
  const maxDigits = Math.min(Math.max(maximumFractionDigits, minimumFractionDigits), ETH_DECIMALS)
  const rounded = fromWei(roundWei(toWei(value), maxDigits))
  const [whole, fraction = ''] = rounded.split('.')
  const digits = fraction.padEnd(minimumFractionDigits, '0')
  const text = digits ? `${whole}.${digits}` : whole
  return unit ? `${text} ETH` : text
}
