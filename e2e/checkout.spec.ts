import { expect, test } from '@playwright/test'
import {
  ANA,
  BRUNO,
  EMERALD,
  IVORY,
  cartItemCount,
  confirmButton,
  connectPrimary,
  field,
  listOrderIds,
  openCheckout,
  openReview,
  reviewDialog,
  seedGuestCart,
  signIn,
  storedDrafts,
  trackOrderRequests,
  waitForRealtime,
  walletOption,
} from './support/checkout'
import { openApp, setScenario } from './support/mocks'

test('prefills the collector profile and validates the fields with a focused summary', async ({ page }) => {
  await openCheckout(page)
  await expect(field(page, 'Nome de usuário')).toHaveValue('anaribeiro')
  await expect(field(page, 'Nome do perfil')).toHaveValue('anaribeiro')
  await expect(field(page, 'Código de indicação')).toHaveValue('ANA2026')
  await expect(field(page, 'Nome ENS')).toHaveValue('anaribeiro')
  await expect(field(page, 'Endereço da carteira')).toHaveValue('0x3fA94c2E8b1D7a6C05e9B4f2d18A7c3E6b90D41a')
  await expect(page.locator('[data-slot="checkout-total"]')).toHaveText('2.396 ETH')

  const displayName = field(page, 'Nome de exibição')
  const email = field(page, 'E-mail')
  await displayName.fill('')
  await email.fill('ana@kurio')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()

  await expect(page.getByRole('alert').filter({ hasText: 'Revise 3 campos' })).toHaveText(
    'Revise 3 campos: Nome de exibição, E-mail e Carteira.',
  )
  await expect(displayName).toBeFocused()
  await expect(displayName).toHaveAttribute('aria-invalid', 'true')
  await expect(displayName).toHaveAccessibleDescription('Informe o nome de exibição.')
  await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')
  await expect(page.getByText('Conecte a carteira na rede Ethereum para continuar.')).toBeVisible()
  await expect(reviewDialog(page)).toHaveCount(0)

  await displayName.fill('Ana Ribeiro')
  await expect(displayName).not.toHaveAttribute('aria-invalid', 'true')
  await email.fill('ana@kurio.test')
  await expect(page.getByText('Conecte a carteira na rede Ethereum para continuar.')).toBeVisible()
  await connectPrimary(page)
  await expect(page.getByText('Conecte a carteira na rede Ethereum para continuar.')).toHaveCount(0)
  await expect(page.getByRole('alert').filter({ hasText: 'Revise 3 campos' })).toHaveCount(0)
  await openReview(page)
})

test('reviews data, wallet, network, items and quote totals before sending the order', async ({ page }) => {
  await openCheckout(page)
  await field(page, 'Observação do colecionador').fill('Entregar na carteira principal.')
  await connectPrimary(page)
  await openReview(page)

  const dialog = reviewDialog(page)
  await expect(dialog).toContainText('Ana Ribeiro')
  await expect(dialog).toContainText('anaribeiro.eth')
  await expect(dialog).toContainText('MetaMask · Cofre da Ana')
  await expect(dialog).toContainText('Ethereum')
  await expect(dialog).toContainText('Entregar na carteira principal.')
  await expect(dialog.getByRole('listitem', { name: 'Emerald Ape #042, edição 1/50' })).toContainText('2.38 ETH')
  await expect(dialog.locator('[data-slot="review-total"]')).toHaveText('2.396 ETH')

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeFocused()
  expect(page.url()).toMatch(/\/checkout$/)

  await openReview(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/orders\/order-0001$/)
})

test('shows the rejected wallet connection and allows connecting and disconnecting', async ({ page }) => {
  await openCheckout(page)
  await setScenario(page, 'wallet-rejected')
  const option = walletOption(page, /MetaMask/)

  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(option.getByRole('alert')).toHaveText(
    'A carteira recusou a conexão. Confirme a solicitação na MetaMask e tente novamente.',
  )
  await expect(option.locator('[data-slot="wallet-status"]')).toHaveText('Desconectada')

  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeFocused()
  await expect(reviewDialog(page)).toHaveCount(0)

  await setScenario(page, 'success')
  await connectPrimary(page)
  await expect(option.getByRole('alert')).toHaveCount(0)

  await page.getByRole('button', { name: 'Desconectar MetaMask' }).click()
  await expect(option.locator('[data-slot="wallet-status"]')).toHaveText('Desconectada')
})

test('requires a new confirmation when a cart item price changes over Socket.IO during review', async ({ page }) => {
  await openCheckout(page)
  await waitForRealtime(page)
  await connectPrimary(page)
  await openReview(page)
  await expect(reviewDialog(page).locator('[data-slot="review-total"]')).toHaveText('2.396 ETH')

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', price: '1.31' }))

  const notice = reviewDialog(page).locator('[data-slot="quote-changes"]')
  await expect(notice).toContainText('Emerald Ape #042 (edição 1/50): preço de 1.19 ETH para 1.31 ETH.')
  await expect(notice).toContainText('Total: de 2.396 ETH para 2.636 ETH.')
  await expect(confirmButton(page)).toHaveAttribute('aria-disabled', 'true')

  const requests = trackOrderRequests(page)
  await confirmButton(page).click({ force: true })
  expect(requests).toHaveLength(0)

  await notice.getByRole('button', { name: 'Revisar nova cotação' }).click()
  await expect(notice).toHaveCount(0)
  await expect(reviewDialog(page).locator('[data-slot="review-total"]')).toHaveText('2.636 ETH')
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/orders\/order-0001$/)
  expect(requests).toHaveLength(1)
})

test('handles QUOTE_OUTDATED from the price-changed scenario with a new key for the new quote', async ({ page }) => {
  await openCheckout(page)
  await setScenario(page, 'price-changed')
  await connectPrimary(page)
  const requests = trackOrderRequests(page)
  await openReview(page)
  await confirmButton(page).click()

  const notice = reviewDialog(page).locator('[data-slot="quote-changes"]')
  await expect(notice).toContainText('Emerald Ape #042 (edição 1/50): preço de 1.19 ETH para 1.309 ETH.')
  await expect(notice).toContainText('Total: de 2.396 ETH para 2.634 ETH.')
  await expect(page).toHaveURL(/\/checkout$/)

  await notice.getByRole('button', { name: 'Revisar nova cotação' }).click()
  await expect(reviewDialog(page).locator('[data-slot="review-total"]')).toHaveText('2.634 ETH')
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/orders\/order-0001$/)

  expect(requests).toHaveLength(2)
  const [first, second] = await Promise.all(requests.map((request) => request.headerValue('idempotency-key')))
  expect(first).not.toBe(second)
  expect(await listOrderIds(page)).toEqual(['order-0001'])
})

test('keeps the items when an edition sells out during the purchase and accepts after adjusting the cart', async ({ page }) => {
  await openCheckout(page, [EMERALD, IVORY])
  await setScenario(page, 'edition-sold-out')
  await connectPrimary(page)
  await openReview(page)
  await confirmButton(page).click()

  const dialog = reviewDialog(page)
  await expect(dialog.locator('[data-slot="quote-changes"]')).toContainText('Emerald Ape #042 (edição 1/50): a edição esgotou.')
  await dialog.getByRole('button', { name: 'Revisar nova cotação' }).click()
  await expect(dialog.getByRole('alert').filter({ hasText: 'Há itens esgotados' })).toBeVisible()
  await expect(confirmButton(page)).toHaveAttribute('aria-disabled', 'true')
  expect(await listOrderIds(page)).toEqual([])

  await dialog.getByRole('link', { name: 'Ajustar o carrinho' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.locator('[data-slot="cart-item"]')).toHaveCount(2)
  await page.getByRole('listitem', { name: 'Emerald Ape #042, edição 1/50' }).getByRole('button', { name: /^Remover/ }).click()
  await expect(page.locator('[data-slot="cart-item"]')).toHaveCount(1)

  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)
  await openReview(page)
  await expect(reviewDialog(page).locator('[data-slot="review-total"]')).toHaveText('3.596 ETH')
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/orders\/order-0001$/)
})

test('creates a single order when the confirm button is double clicked', async ({ page }) => {
  await openCheckout(page, [EMERALD], 'success', 'manual')
  await connectPrimary(page)
  const requests = trackOrderRequests(page)
  await openReview(page)

  await confirmButton(page).dblclick()

  await expect(page).toHaveURL(/\/orders\/order-0001$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Aguardando confirmação do pagamento' })).toBeVisible()
  expect(requests).toHaveLength(1)
  expect(await listOrderIds(page)).toEqual(['order-0001'])
  await page.evaluate(() => window.__mocks?.advanceOrder('order-0001'))
  await expect(page.getByRole('heading', { level: 1, name: 'Seus NFTs agora estão na sua carteira' })).toBeFocused()
  expect(await listOrderIds(page)).toEqual(['order-0001'])
})

test('recovers the same order with the same key after the creation times out', async ({ page }) => {
  await page.clock.install()
  await openCheckout(page)
  await setScenario(page, 'order-timeout')
  await connectPrimary(page)
  const requests = trackOrderRequests(page)
  await openReview(page)

  await confirmButton(page).click()
  await expect.poll(() => requests.length).toBe(1)
  await expect(confirmButton(page)).toHaveCount(0)
  await expect(reviewDialog(page).getByRole('button', { name: 'Enviando pedido…' })).toHaveAttribute('aria-disabled', 'true')

  await page.clock.fastForward(10_000)
  await expect(reviewDialog(page).getByRole('status')).toContainText('Estamos verificando o seu pedido.')
  await expect(page).toHaveURL(/\/checkout$/)

  await page.clock.fastForward(1000)
  await expect(page).toHaveURL(/\/orders\/order-0001$/)
  await page.clock.fastForward(3000)
  await expect(page.getByRole('heading', { level: 1, name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(page.locator('[data-slot="order-total"]')).toHaveText('2.396 ETH')

  expect(requests).toHaveLength(2)
  const keys = await Promise.all(requests.map((request) => request.headerValue('idempotency-key')))
  expect(keys[0]).toBeTruthy()
  expect(keys[1]).toBe(keys[0])
  expect(await listOrderIds(page)).toEqual(['order-0001'])
})

test('restores the checkout draft after the session expires and the same user signs in again', async ({ page }) => {
  await openCheckout(page)
  await field(page, 'Nome de exibição').fill('Ana R. Colecionadora')
  await field(page, 'Observação do colecionador').fill('Entregar com cuidado.')
  await page.getByRole('radio', { name: /Coinbase Wallet/ }).check()
  await expect(page.getByRole('combobox', { name: 'Rede' })).toContainText('Polygon')
  await expect(page.locator('[data-slot="checkout-fee"]')).toHaveText('0.002 ETH')

  await page.evaluate(() => window.__mocks?.expireSessions())
  await page.getByRole('button', { name: 'Conectar Coinbase Wallet' }).click()

  await expect(page).toHaveURL(/\/login\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('redirect')).toBe('/checkout')
  expect(url.searchParams.get('reason')).toBe('expired')

  await signIn(page, ANA.email)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText('Recuperamos os dados que você tinha preenchido nesta compra.')).toBeVisible()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana R. Colecionadora')
  await expect(field(page, 'Observação do colecionador')).toHaveValue('Entregar com cuidado.')
  await expect(page.getByRole('radio', { name: /Coinbase Wallet/ })).toBeChecked()
  await expect(page.getByRole('combobox', { name: 'Rede' })).toContainText('Polygon')
  await expect(page.locator('[data-slot="checkout-fee"]')).toHaveText('0.002 ETH')
})

test('never shows the checkout draft of ana to bruno after the session expires', async ({ page }) => {
  await openCheckout(page)
  await field(page, 'Observação do colecionador').fill('Rascunho privado da Ana.')
  await page.getByRole('radio', { name: /Coinbase Wallet/ }).check()
  await expect(page.locator('[data-slot="checkout-fee"]')).toHaveText('0.002 ETH')

  await page.evaluate(() => window.__mocks?.expireSessions())
  await page.getByRole('button', { name: 'Conectar Coinbase Wallet' }).click()
  await expect(page).toHaveURL(/\/login\?/)

  await seedGuestCart(page, [IVORY])
  await signIn(page, BRUNO.email)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(field(page, 'Nome de exibição')).toHaveValue(BRUNO.name)
  await expect(field(page, 'Observação do colecionador')).toHaveValue('')
  await expect(page.getByText('Rascunho privado da Ana.')).toHaveCount(0)
  await expect(page.getByRole('radio', { name: /Coinbase Wallet/ })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: /WalletConnect/ })).toBeChecked()
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)

  const owners = await page.evaluate(() =>
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('kurio.resume.'))
      .map((key) => (JSON.parse(sessionStorage.getItem(key) ?? '{}') as { userId?: string }).userId),
  )
  expect(owners).toEqual([BRUNO.id])
})

test('shows the empty cart state with a link to the catalog', async ({ page }) => {
  await openApp(page, '/login?redirect=%2Fcheckout')
  await signIn(page, ANA.email)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
  await expect(page).toHaveURL(/\/#catalogo$/)
})

test('keeps the quote skeleton within the final layout while the quote loads slowly', async ({ page }) => {
  await openCheckout(page)
  await page.evaluate(() => window.__mocks?.setLatency('slow'))
  await page.reload()
  const skeleton = page.locator('[data-slot="checkout-line-skeleton"]').first()
  await expect(skeleton).toBeVisible({ timeout: 15_000 })
  const before = await skeleton.boundingBox()
  const line = page.locator('[data-slot="checkout-line"]').first()
  await expect(line).toBeVisible({ timeout: 15_000 })
  const after = await line.boundingBox()
  expect(after?.y).toBeCloseTo(before?.y ?? 0, 0)
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 0)
})

test('shows the order fieldErrors from the API in the collector field with focus and announcement', async ({ page }) => {
  await openCheckout(page)
  await connectPrimary(page)
  await setScenario(page, 'form-validation')
  await openReview(page)
  await confirmButton(page).click()

  const message = 'Código de indicação não reconhecido pelo programa de indicações.'
  const referral = field(page, 'Código de indicação')
  await expect(reviewDialog(page)).toHaveCount(0)
  await expect(referral).toBeFocused()
  await expect(referral).toHaveAttribute('aria-invalid', 'true')
  await expect(referral).toHaveAccessibleDescription(message)
  await expect(page.getByRole('alert').filter({ hasText: 'Revise o campo' })).toHaveText(`Revise o campo Código de indicação: ${message}`)
  await expect(page.locator('[data-live-announcer]')).toHaveText(`Revise o campo Código de indicação: ${message}`)

  expect(await listOrderIds(page)).toEqual([])
  expect(await cartItemCount(page)).toBe(2)
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)
})

test('clears the checkout draft and the stored idempotency key on logout', async ({ page, isMobile }) => {
  await openCheckout(page)
  await field(page, 'Nome de exibição').fill('Ana Antes de Sair')
  await field(page, 'Observação do colecionador').fill('Rascunho antes de sair.')
  await connectPrimary(page)
  await setScenario(page, 'form-validation')
  await openReview(page)
  await confirmButton(page).click()
  await expect(reviewDialog(page)).toHaveCount(0)
  await expect.poll(async () => (await storedDrafts(page)).map((draft) => [draft.userId, !!draft.data?.attempt?.key])).toEqual([
    [ANA.id, true],
  ])

  if (isMobile) {
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).not.toHaveURL(/\/checkout$/)
    expect(await storedDrafts(page)).toHaveLength(1)
  }
  await page.getByRole('button', { name: /^Menu da conta de/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-live-announcer]')).toHaveText('Você saiu da sua conta.')
  expect(await storedDrafts(page)).toEqual([])

  await setScenario(page, 'success')
  await page.goto('/login?redirect=%2Fcheckout')
  await signIn(page, ANA.email)
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(field(page, 'Nome de exibição')).toHaveValue(ANA.name)
  await expect(field(page, 'Observação do colecionador')).toHaveValue('')
  await expect(page.getByText('Recuperamos os dados que você tinha preenchido nesta compra.')).toHaveCount(0)
  await expect.poll(async () => (await storedDrafts(page)).map((draft) => [draft.userId, !!draft.data?.attempt?.key])).toEqual([
    [ANA.id, false],
  ])
})
