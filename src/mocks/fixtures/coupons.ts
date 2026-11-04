export interface CouponFixture {
  code: string
  percent: string
  label: string
  expiresAt: string
}

export const COUPON_CODE_PATTERN = /^[A-Z0-9]{4,20}$/

export const couponFixtures: CouponFixture[] = [
  {
    code: 'KURIO10',
    percent: '10',
    label: 'Desconto do lançamento',
    expiresAt: '2099-12-31T23:59:59.000Z',
  },
  {
    code: 'GENESIS25',
    percent: '25',
    label: 'Desconto do lançamento',
    expiresAt: '2025-01-31T23:59:59.000Z',
  },
]
