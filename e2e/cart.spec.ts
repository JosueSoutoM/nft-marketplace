import { expect, test, type Locator, type Page } from '@playwright/test'
import { openApp, setScenario } from './support/mocks'

const PASSWORD = 'Kurio#2026'
const EMERALD = 'Emerald Ape #042, edição 1/50'

interface SeedItem {
  nftId: string
  editionId: string
  quantity: number
}

async function seedGuestCart(page: Page, items: SeedItem[]) {
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

async function openCartWith(page: Page, items: SeedItem[]) {
  await openApp(page)
  await seedGuestCart(page, items)
  await page.goto('/cart')
  await expect(cartItems(page)).toHaveCount(items.length)
}

function cartItems(page: Page): Locator {
  return page.locator('[data-slot="cart-item"]')
}

function cartItem(page: Page, label: string): Locator {
  return page.getByRole('listitem', { name: label })
}

function summary(page: Page, field: 'subtotal' | 'discount' | 'fee' | 'total'): Locator {
  return page.locator(`[data-slot="summary-${field}"]`)
}

function announcer(page: Page): Locator {
  return page.locator('[data-live-announcer]')
}

function cartLink(page: Page): Locator {
  return page.getByRole('link', { name: /^Carrinho/ }).first()
}

async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => (window.__mocks?.getRealtimeStatus().connections.length ?? 0) > 0)
}

test('adds the selected edition and quantity from the detail and shows the real count', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()

  await expect(page.getByText('Emerald Ape #042 foi adicionado ao carrinho.')).toBeVisible()
  await expect(page.getByText('2 unidades da edição 1/50. O carrinho tem 2 itens.')).toBeVisible()
  await expect(cartLink(page)).toHaveAccessibleName('Carrinho, 2 itens')

  await page.getByRole('button', { name: 'Ver carrinho' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  const item = cartItem(page, EMERALD)
  await expect(item).toContainText('Edição: 1/50')
  await expect(item.getByRole('textbox', { name: `Quantidade de ${EMERALD}` })).toHaveValue('2')
  await expect(item).toContainText('2.38 ETH')
  await expect(summary(page, 'subtotal')).toHaveText('2.38 ETH')
  await expect(summary(page, 'discount')).toHaveText('(-) 0.00 ETH')
  await expect(summary(page, 'fee')).toHaveText('0.016 ETH')
  await expect(summary(page, 'total')).toHaveText('2.396 ETH')
})

test('shows the maximum quantity when adding goes over the availability', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', available: 3 }))
  await seedGuestCart(page, [{ nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 3 }])

  await page.goto('/nfts/emerald-ape-042')
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()

  await expect(page.getByText('Emerald Ape #042: apenas 3 unidades disponíveis nesta edição.')).toBeVisible()
  await expect(page.getByText('Você já tem 3 unidades no carrinho. Disponível nesta edição: 3 unidades.')).toBeVisible()
  await expect(cartLink(page)).toHaveAccessibleName('Carrinho, 3 itens')
})

test('changes quantities within the availability and removes items', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', available: 3 }))
  await seedGuestCart(page, [
    { nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 1 },
    { nftId: 'ivory-baron-088', editionId: 'limited-10', quantity: 1 },
  ])
  await page.goto('/cart')
  const item = cartItem(page, EMERALD)
  const input = item.getByRole('textbox', { name: `Quantidade de ${EMERALD}` })
  const increase = item.getByRole('button', { name: `Aumentar quantidade de ${EMERALD}` })

  await increase.click()
  await expect(input).toHaveValue('2')
  await expect(announcer(page)).toHaveText(`Quantidade de ${EMERALD} alterada para 2.`)
  await expect(summary(page, 'subtotal')).toHaveText('5.96 ETH')

  await input.fill('9')
  await input.press('Enter')
  await expect(input).toHaveValue('3')
  await expect(item.locator('[data-slot="cart-quantity-limit"]')).toHaveText('Só restam 3 unidades desta edição.')
  await expect(increase).toHaveAttribute('aria-disabled', 'true')
  await expect(input).toHaveAccessibleDescription('Só restam 3 unidades desta edição.')
  await expect(summary(page, 'subtotal')).toHaveText('7.15 ETH')

  await item.getByRole('button', { name: `Diminuir quantidade de ${EMERALD}` }).click()
  await expect(input).toHaveValue('2')

  await item.getByRole('button', { name: `Remover ${EMERALD} do carrinho` }).click()
  await expect(announcer(page)).toHaveText(`${EMERALD} foi removido do carrinho.`)
  await expect(cartItems(page)).toHaveCount(1)
  await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toBeFocused()
  await expect(summary(page, 'subtotal')).toHaveText('3.58 ETH')

  await cartItem(page, 'Ivory Baron #088, edição 1/10').getByRole('button', { name: /^Remover/ }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
  await expect(page).toHaveURL(/\/#catalogo$/)
})

test('applies and removes coupons with distinct messages for invalid and expired codes', async ({ page }) => {
  await openCartWith(page, [{ nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 2 }])
  const field = page.getByRole('textbox', { name: 'Código promocional' })
  const apply = page.getByRole('button', { name: 'Aplicar' })

  await field.fill('XPTO2026')
  await apply.click()
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toHaveAccessibleDescription('O cupom XPTO2026 não existe. Confira o código e tente novamente.')
  await expect(field).toBeFocused()

  await field.fill('genesis25')
  await expect(field).not.toHaveAttribute('aria-invalid', 'true')
  await apply.click()
  await expect(field).toHaveAccessibleDescription('O cupom GENESIS25 expirou em 31/01/2025.')
  await expect(summary(page, 'discount')).toHaveText('(-) 0.00 ETH')

  await field.fill('KURIO10')
  await apply.click()
  await expect(page.getByText('Cupom KURIO10 aplicado: 10% de desconto.')).toBeVisible()
  await expect(field).not.toHaveAttribute('aria-invalid', 'true')
  await expect(summary(page, 'discount')).toHaveText('(-) 0.238 ETH')
  await expect(summary(page, 'total')).toHaveText('2.158 ETH')

  await page.reload()
  await expect(summary(page, 'discount')).toHaveText('(-) 0.238 ETH')

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(announcer(page)).toHaveText('Cupom KURIO10 removido. O resumo foi atualizado.')
  await expect(summary(page, 'discount')).toHaveText('(-) 0.00 ETH')
  await expect(summary(page, 'total')).toHaveText('2.396 ETH')
})

test('keeps the visitor cart after refresh and after signing in', async ({ page }) => {
  await openCartWith(page, [{ nftId: 'golden-beat-207', editionId: 'limited-50', quantity: 2 }])

  await page.reload()
  await expect(cartItem(page, 'Golden Beat #207, edição 1/50')).toBeVisible()

  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout$/)
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)

  await page.goto('/cart')
  const item = cartItem(page, 'Golden Beat #207, edição 1/50')
  await expect(item.getByRole('textbox', { name: /^Quantidade de/ })).toHaveValue('2')
  await page.reload()
  await expect(item).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio.guest-cart-id'))).toBeNull()
})

test('warns about price and availability changes from Socket.IO and refreshes the summary', async ({ page }) => {
  await openCartWith(page, [{ nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 1 }])
  await waitForRealtime(page)
  await expect(summary(page, 'total')).toHaveText('1.206 ETH')
  const item = cartItem(page, EMERALD)

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', price: '1.31' }))

  await expect(item.locator('[data-slot="cart-item-notice"]')).toHaveText('Preço alterado de 1.19 ETH para 1.31 ETH.')
  await expect(announcer(page)).toHaveText(`${EMERALD}, no carrinho: Preço alterado de 1.19 ETH para 1.31 ETH.`)
  await expect(summary(page, 'subtotal')).toHaveText('1.31 ETH')
  await expect(summary(page, 'total')).toHaveText('1.326 ETH')

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', available: 0 }))

  await expect(item.locator('[data-slot="cart-item-notice"]')).toHaveText('Edição esgotada.')
  await expect(item.locator('[data-slot="cart-item-issue"]')).toHaveText('Edição esgotada. Remova o item para continuar.')
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toHaveAttribute('aria-disabled', 'true')
})

test('keeps the items when a mutation fails and recovers on retry', async ({ page }) => {
  await openCartWith(page, [{ nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 1 }])
  const item = cartItem(page, EMERALD)
  const input = item.getByRole('textbox', { name: `Quantidade de ${EMERALD}` })
  const increase = item.getByRole('button', { name: `Aumentar quantidade de ${EMERALD}` })

  await setScenario(page, 'service-unavailable')
  await increase.click()
  await expect(item.getByRole('alert')).toBeVisible()
  await expect(input).toHaveValue('1')
  await expect(cartItems(page)).toHaveCount(1)

  await setScenario(page, 'success')
  await increase.click()
  await expect(input).toHaveValue('2')
  await expect(item.getByRole('alert')).toHaveCount(0)
})

test('shows an error with retry when the cart cannot be loaded', async ({ page }) => {
  await openApp(page, '/cart', { scenario: 'service-unavailable' })
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar o carrinho' })).toBeVisible({ timeout: 15_000 })

  await setScenario(page, 'success')
  await page.getByRole('alert').filter({ hasText: 'carrinho' }).getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('shows skeletons without layout shift while the cart loads slowly', async ({ page }) => {
  await openApp(page)
  await seedGuestCart(page, [{ nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 1 }])
  await page.evaluate(() => window.__mocks?.setLatency('slow'))
  await page.goto('/cart')

  const skeletonRow = page.locator('[data-slot="cart-item-skeleton"]').first()
  await expect(skeletonRow).toBeVisible()
  const skeletonBox = await skeletonRow.boundingBox()

  const row = cartItems(page).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  const rowBox = await row.boundingBox()
  expect(rowBox?.y).toBeCloseTo(skeletonBox?.y ?? 0, 0)
  expect(rowBox?.height).toBeCloseTo(skeletonBox?.height ?? 0, 0)
  await expect(summary(page, 'total').locator('[data-slot="skeleton"]')).toBeVisible()
  await expect(summary(page, 'total')).toHaveText('1.206 ETH', { timeout: 15_000 })
})
