import { expect, type Locator, type Page, type Request } from '@playwright/test'
import { openApp, type Scenario, type Settlement } from './mocks'

export const PASSWORD = 'Kurio#2026'
export const ANA = { email: 'ana@kurio.test', name: 'Ana Ribeiro', id: 'user-ana' }
export const BRUNO = { email: 'bruno@kurio.test', name: 'Bruno Tavares', id: 'user-bruno' }
export const EMERALD = { nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 2 }
export const IVORY = { nftId: 'ivory-baron-088', editionId: 'limited-10', quantity: 1 }

export interface SeedItem {
  nftId: string
  editionId: string
  quantity: number
}

export async function seedGuestCart(page: Page, items: SeedItem[]) {
  await page.evaluate(async (entries) => {
    const guestCartId = localStorage.getItem('kurio.guest-cart-id') ?? crypto.randomUUID()
    localStorage.setItem('kurio.guest-cart-id', guestCartId)
    for (const entry of entries) {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Guest-Cart-Id': guestCartId },
        body: JSON.stringify(entry),
      })
      if (!response.ok) {
        throw new Error(`cart ${response.status}`)
      }
    }
  }, items)
}

export async function signIn(page: Page, email: string) {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export async function openCheckout(page: Page, items: SeedItem[] = [EMERALD], scenario: Scenario = 'success', settlement: Settlement = 'auto') {
  await openApp(page, '/', { scenario, settlement })
  await seedGuestCart(page, items)
  await page.goto('/login?redirect=%2Fcheckout')
  await signIn(page, ANA.email)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(items.length)
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(ANA.name)
}

export function field(page: Page, label: string): Locator {
  return page.getByLabel(label, { exact: false }).first()
}

export function walletOption(page: Page, label: RegExp): Locator {
  return page.locator('[data-slot="wallet-option"]').filter({ has: page.getByRole('radio', { name: label }) })
}

export async function connectPrimary(page: Page) {
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(walletOption(page, /MetaMask/).locator('[data-slot="wallet-status"]')).toHaveText('Conectada na rede Ethereum')
}

export function reviewDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Revise sua compra' })
}

export function confirmButton(page: Page): Locator {
  return reviewDialog(page).getByRole('button', { name: 'Confirmar e enviar pedido' })
}

export async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(reviewDialog(page)).toBeVisible()
}

export function trackOrderRequests(page: Page): Request[] {
  const requests: Request[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') {
      requests.push(request)
    }
  })
  return requests
}

export async function listOrderIds(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const { token } = JSON.parse(localStorage.getItem('kurio.session') ?? '{}') as { token?: string }
    const response = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
    const body = (await response.json()) as { items: Array<{ id: string }> }
    return body.items.map((order) => order.id)
  })
}

export async function cartItemCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const { token } = JSON.parse(localStorage.getItem('kurio.session') ?? '{}') as { token?: string }
    const response = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
    return ((await response.json()) as { itemCount: number }).itemCount
  })
}

export async function storedDrafts(page: Page): Promise<Array<{ userId?: string; data?: { attempt?: { key?: string } | null } }>> {
  return page.evaluate(() =>
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('kurio.resume.'))
      .map((key) => JSON.parse(sessionStorage.getItem(key) ?? '{}') as { userId?: string; data?: { attempt?: { key?: string } | null } }),
  )
}

export async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => (window.__mocks?.getRealtimeStatus().connections.length ?? 0) > 0)
}
