import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  ANA,
  BRUNO,
  EMERALD,
  IVORY,
  cartItemCount,
  confirmButton,
  connectPrimary,
  listOrderIds,
  openCheckout,
  openReview,
  signIn,
  storedDrafts,
  trackOrderRequests,
  waitForRealtime,
} from './support/checkout'
import { openApp, setScenario } from './support/mocks'

const PENDING = 'Aguardando confirmação do pagamento'
const CONFIRMED = 'Seus NFTs agora estão na sua carteira'
const DECLINED = 'Pagamento recusado'

function title(page: Page, name: string): Locator {
  return page.getByRole('heading', { level: 1, name })
}

function announcer(page: Page): Locator {
  return page.locator('[data-live-announcer]')
}

async function placeOrder(page: Page) {
  await connectPrimary(page)
  await openReview(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/orders\/order-0001$/)
  await expect(title(page, PENDING)).toBeVisible()
}

async function advance(page: Page, status?: 'confirmed' | 'declined') {
  await page.evaluate((next) => window.__mocks?.advanceOrder('order-0001', next), status)
}

async function addToUserCart(page: Page, item: { nftId: string; editionId: string; quantity: number }) {
  await page.evaluate(async (entry) => {
    const { token } = JSON.parse(localStorage.getItem('kurio.session') ?? '{}') as { token?: string }
    const response = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(entry),
    })
    if (!response.ok) {
      throw new Error(`cart ${response.status}`)
    }
  }, item)
}

async function cartQuantities(page: Page): Promise<Array<[string, number]>> {
  return page.evaluate(async () => {
    const { token } = JSON.parse(localStorage.getItem('kurio.session') ?? '{}') as { token?: string }
    const response = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } })
    const cart = (await response.json()) as { items: Array<{ nftId: string; editionId: string; quantity: number }> }
    return cart.items.map((item): [string, number] => [`${item.nftId}/${item.editionId}`, item.quantity])
  })
}

test('completes a purchase from the catalog to the confirmed receipt', async ({ page, context, isMobile }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.clock.install()
  await openApp(page, '/')
  await page.getByRole('link', { name: /Emerald Ape #042/ }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await page.getByRole('button', { name: 'Ver carrinho' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout$/)
  await signIn(page, ANA.email)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)
  await waitForRealtime(page)

  await placeOrder(page)
  await expect(page.locator('[data-slot="order-realtime"]')).toHaveText('A confirmação aparece aqui automaticamente, em tempo real.')
  await expect(page.locator('[data-slot="order-total"]')).toHaveText('2.396 ETH')

  await page.clock.fastForward(3000)

  const heading = title(page, CONFIRMED)
  await expect(heading).toBeFocused()
  await expect(announcer(page)).toHaveText('Pagamento confirmado. Seus NFTs agora estão na sua carteira. Pedido order-0001.')
  const receipt = page.locator('[data-slot="order-confirmed"]')
  const icon = receipt.locator('img').first()
  await expect(icon).toHaveAttribute('alt', '')
  await expect.poll(() => icon.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(66)
  await expect(receipt.getByRole('listitem', { name: 'Emerald Ape #042, edição 1/50' })).toContainText('2.38 ETH')
  await expect(receipt.locator('[data-slot="order-subtotal"]')).toHaveText('2.38 ETH')
  await expect(receipt.locator('[data-slot="order-discount"]')).toHaveText('(-) 0.00 ETH')
  await expect(receipt.locator('[data-slot="order-fee"]')).toHaveText('0.016 ETH')
  await expect(receipt.locator('[data-slot="order-total"]')).toHaveText('2.396 ETH')
  await expect(receipt).toContainText('MetaMask')
  await expect(receipt).toContainText('Transação simulada confirmada na Ethereum.')

  const hash = (await receipt.locator('[data-slot="order-transaction-id"] .sr-only').textContent()) ?? ''
  expect(hash).toMatch(/^0x[0-9a-f]{64}$/)
  await receipt.getByRole('button', { name: 'Copiar ID da transação' }).click()
  await expect(announcer(page)).toHaveText('ID da transação copiado.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(hash)

  await receipt.getByRole('button', { name: 'Ver no explorador (simulado)' }).click()
  const explorer = page.getByRole('dialog', { name: 'Explorador simulado' })
  await expect(explorer).toContainText('Nenhuma rede ou explorador real foi consultado.')
  await expect(explorer.locator('[data-slot="explorer-hash"]')).toHaveText(hash)
  await expect(explorer).toContainText(`https://explorer.kurio.test/ethereum/tx/${hash}`)
  await page.keyboard.press('Escape')

  expect(await cartItemCount(page)).toBe(0)
  if (!isMobile) {
    await expect(page.getByRole('link', { name: 'Carrinho', exact: true })).toBeVisible()
  }
  expect(await listOrderIds(page)).toEqual(['order-0001'])
  expect(await storedDrafts(page)).toEqual([])

  await receipt.getByRole('link', { name: 'Ver carrinho' }).click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})

test('shows the declined payment with the items preserved and a new attempt with a new key', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'payment-declined', 'manual')
  const requests = trackOrderRequests(page)
  await placeOrder(page)

  await advance(page)
  await expect(title(page, DECLINED)).toBeFocused()
  await expect(page.locator('[data-slot="order-decline-reason"]')).toHaveText('O pagamento foi recusado pela carteira. Nenhum valor foi cobrado.')
  await expect(page.locator('[data-slot="order-declined"]')).toContainText('Os itens continuam no seu carrinho.')
  await expect(announcer(page)).toHaveText(
    'Pagamento recusado. O pagamento foi recusado pela carteira. Nenhum valor foi cobrado. Os itens continuam no seu carrinho.',
  )
  expect(await cartQuantities(page)).toEqual([['emerald-ape-042/limited-50', 2]])
  expect(await storedDrafts(page)).toEqual([])

  await setScenario(page, 'success')
  await page.getByRole('link', { name: 'Voltar ao pagamento' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)
  await openReview(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/orders\/order-0002$/)

  expect(requests).toHaveLength(2)
  const [first, second] = await Promise.all(requests.map((request) => request.headerValue('idempotency-key')))
  expect(second).not.toBe(first)
  expect(await listOrderIds(page)).toEqual(['order-0002', 'order-0001'])
})

test('recovers the pending order after a refresh without creating another purchase', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'success', 'manual')
  const requests = trackOrderRequests(page)
  await placeOrder(page)

  await page.reload()
  await expect(title(page, PENDING)).toBeVisible()
  await expect(page.locator('[data-slot="order-total"]')).toHaveText('2.396 ETH')
  expect(await listOrderIds(page)).toEqual(['order-0001'])

  await page.getByRole('button', { name: 'Atualizar status' }).click()
  await expect(announcer(page)).toHaveText('O pedido continua aguardando a confirmação do pagamento.')

  await waitForRealtime(page)
  await advance(page)
  await expect(title(page, CONFIRMED)).toBeFocused()
  expect(requests).toHaveLength(1)
  expect(await listOrderIds(page)).toEqual(['order-0001'])
})

test('resumes a pending order from the API after the socket reconnects', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'success', 'manual')
  await placeOrder(page)
  await waitForRealtime(page)

  await page.evaluate(() => window.__mocks?.refuseRealtime(2))
  await expect(page.locator('[data-slot="order-realtime"]')).toContainText('A conexão em tempo real caiu.')
  await advance(page)
  await expect(title(page, PENDING)).toBeVisible()

  await expect(title(page, CONFIRMED)).toBeFocused({ timeout: 15_000 })
  await expect(announcer(page)).toHaveText('Pagamento confirmado. Seus NFTs agora estão na sua carteira. Pedido order-0001.')
  expect(await listOrderIds(page)).toEqual(['order-0001'])
})

test('ignores duplicated and stale order.updated events after the confirmation', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'success', 'manual')
  await placeOrder(page)
  await waitForRealtime(page)
  await advance(page)
  await expect(title(page, CONFIRMED)).toBeFocused()
  await page.evaluate(() => {
    const element = document.querySelector('[data-live-announcer]')
    const counter = { count: 0 }
    Object.assign(window, { __announcements: counter })
    if (element) {
      new MutationObserver(() => {
        counter.count += 1
      }).observe(element, { childList: true, subtree: true, characterData: true })
    }
  })

  const replayed = await page.evaluate(() => window.__mocks?.replayLastEvent())
  expect(replayed?.type).toBe('order.updated')
  const stale = await page.evaluate(() => window.__mocks?.sendStaleEvent())
  expect(stale?.type).toBe('order.updated')
  await page.waitForTimeout(500)

  await expect(title(page, CONFIRMED)).toBeVisible()
  await expect(title(page, PENDING)).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __announcements: { count: number } }).__announcements.count)).toBe(0)

  await page.reload()
  await expect(title(page, CONFIRMED)).toBeVisible()
})

test('keeps the receipt values from the order snapshot after the catalog price changes', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'success', 'manual')
  await placeOrder(page)
  await waitForRealtime(page)
  await advance(page)
  await expect(title(page, CONFIRMED)).toBeVisible()

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', price: '9.99' }))
  const receipt = page.locator('[data-slot="order-confirmed"]')
  await expect.poll(() => page.evaluate(() => window.__mocks?.getRealtimeStatus().connections.length)).toBeGreaterThan(0)
  await page.waitForTimeout(300)
  await expect(receipt.locator('[data-slot="order-line-total"]')).toHaveText('Subtotal do item: 2.38 ETH')
  await expect(receipt.locator('[data-slot="order-total"]')).toHaveText('2.396 ETH')

  await page.reload()
  await expect(receipt.locator('[data-slot="order-line-total"]')).toHaveText('Subtotal do item: 2.38 ETH')
  await expect(receipt.locator('[data-slot="order-subtotal"]')).toHaveText('2.38 ETH')
  await expect(receipt.locator('[data-slot="order-total"]')).toHaveText('2.396 ETH')
})

test('removes only the purchased items and quantities from the cart', async ({ page }) => {
  await openCheckout(page, [EMERALD, IVORY], 'success', 'manual')
  await placeOrder(page)
  await addToUserCart(page, { nftId: 'emerald-ape-042', editionId: 'limited-50', quantity: 1 })
  expect(await cartQuantities(page)).toEqual([
    ['emerald-ape-042/limited-50', 3],
    ['ivory-baron-088/limited-10', 1],
  ])

  await waitForRealtime(page)
  await advance(page)
  await expect(title(page, CONFIRMED)).toBeVisible()
  expect(await cartQuantities(page)).toEqual([['emerald-ape-042/limited-50', 1]])

  await page.locator('[data-slot="order-confirmed"]').getByRole('link', { name: 'Ver carrinho' }).click()
  await expect(page.locator('[data-slot="cart-item"]')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: /^Quantidade de Emerald Ape #042/ })).toHaveValue('1')
})

test('does not show the order of ana to bruno', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'success', 'manual')
  await placeOrder(page)
  await page.evaluate(() => {
    localStorage.removeItem('kurio.session')
    sessionStorage.clear()
  })

  await page.goto('/login?redirect=%2Forders%2Forder-0001')
  await signIn(page, BRUNO.email)
  await expect(page).toHaveURL(/\/orders\/order-0001$/)
  await expect(title(page, 'Pedido não encontrado')).toBeVisible()
  await expect(page.getByText('Emerald Ape #042')).toHaveCount(0)
  await expect(page.getByText('2.396 ETH')).toHaveCount(0)
  expect(await listOrderIds(page)).toEqual([])
})
