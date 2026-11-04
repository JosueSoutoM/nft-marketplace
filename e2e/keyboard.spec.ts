import { expect, test, type Locator, type Page } from '@playwright/test'
import { ANA, PASSWORD, reviewDialog, waitForRealtime } from './support/checkout'
import { openApp } from './support/mocks'

const MAX_TABS = 120

interface FocusStyle {
  outline: boolean
  border: string
  shadow: string
}

async function focusStyle(target: Locator): Promise<FocusStyle> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outline: style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
      border: style.borderColor,
      shadow: style.boxShadow,
    }
  })
}

async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  await expect(target).toBeVisible()
  const idle = await focusStyle(target)
  for (let step = 0; step < MAX_TABS; step += 1) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false)) {
      await expect
        .poll(async () => {
          const focused = await focusStyle(target)
          return focused.outline || focused.border !== idle.border || focused.shadow !== idle.shadow
        }, { message: 'foco visível no alvo' })
        .toBe(true)
      return
    }
    await page.keyboard.press(key)
  }
  throw new Error(`Alvo não alcançado com ${key}: ${target.toString()}`)
}

async function activate(page: Page, target: Locator) {
  await tabTo(page, target)
  await page.keyboard.press('Enter')
}

test('completes a purchase from the catalog to the confirmed receipt using only the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Fluxo de teclado verificado no projeto desktop')
  await openApp(page, '/')
  await expect(page.locator('#catalogo article h3').first()).toBeVisible()

  await activate(page, page.getByRole('link', { name: /Emerald Ape #042/ }).first())
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042/)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  await activate(page, page.getByRole('button', { name: 'Aumentar quantidade' }))
  await activate(page, page.getByRole('button', { name: /^Comprar( NFT)?$/ }))
  await expect(page.getByText('Emerald Ape #042 foi adicionado ao carrinho.')).toBeVisible()

  await activate(page, page.getByRole('link', { name: 'Carrinho', exact: true }).or(page.getByRole('link', { name: /^Carrinho,/ })).first())
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.locator('[data-slot="cart-item"]')).toHaveCount(1)

  await activate(page, page.getByRole('link', { name: 'Conectar e finalizar' }))
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout$/)
  const loginDialog = page.getByRole('dialog')
  await expect(loginDialog).toBeVisible()
  const email = loginDialog.getByLabel('E-mail', { exact: true })
  await expect(email).toBeFocused()
  await page.keyboard.type(ANA.email)
  await tabTo(page, loginDialog.getByLabel('Senha', { exact: true }))
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)
  await waitForRealtime(page)

  await activate(page, page.getByRole('button', { name: 'Conectar MetaMask' }))
  await expect(page.locator('[data-slot="wallet-status"]').first()).toHaveText('Conectada na rede Ethereum')

  await activate(page, page.getByRole('button', { name: 'Confirmar compra' }))
  const review = reviewDialog(page)
  await expect(review).toBeVisible()
  expect(await review.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)

  for (let step = 0; step < 15; step += 1) {
    await page.keyboard.press('Tab')
    expect(await review.evaluate((dialog) => dialog.contains(document.activeElement)), 'foco preso no diálogo').toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(review).toBeHidden()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(review).toBeVisible()
  await activate(page, review.getByRole('button', { name: 'Confirmar e enviar pedido' }))

  await expect(page).toHaveURL(/\/orders\/order-0001$/)
  const confirmed = page.getByRole('heading', { level: 1, name: 'Seus NFTs agora estão na sua carteira' })
  await expect(confirmed).toBeFocused({ timeout: 10_000 })
  await expect(page.locator('[data-slot="order-total"]').first()).toHaveText('2.396 ETH')
})
