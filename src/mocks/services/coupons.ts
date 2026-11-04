import type { QuoteCouponError } from '@/api/contracts'
import { getDb, type CouponRecord } from '../db'
import { isScenario } from '../scenarios'

export type CouponResolution = { ok: true; coupon: CouponRecord } | { ok: false; error: QuoteCouponError }

function invalid(code: string): CouponResolution {
  return {
    ok: false,
    error: { code, reason: 'COUPON_INVALID', message: `O cupom ${code} não existe. Confira o código e tente novamente.` },
  }
}

function expired(code: string, expiresAt: string | null): CouponResolution {
  const date = expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : null
  return {
    ok: false,
    error: {
      code,
      reason: 'COUPON_EXPIRED',
      message: date ? `O cupom ${code} expirou em ${date}.` : `O cupom ${code} expirou.`,
    },
  }
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

export function resolveCoupon(code: string): CouponResolution {
  if (isScenario('coupon-invalid')) {
    return invalid(code)
  }
  if (isScenario('coupon-expired')) {
    return expired(code, null)
  }
  const coupon = getDb().coupons.find((record) => record.code === code)
  if (!coupon) {
    return invalid(code)
  }
  if (Date.parse(coupon.expiresAt) <= Date.now()) {
    return expired(code, coupon.expiresAt)
  }
  return { ok: true, coupon }
}
