import { expect, test, type Locator, type Page } from '@playwright/test'
import { EMERALD, confirmButton, connectPrimary, openCheckout, openReview, seedGuestCart } from './support/checkout'
import { openApp } from './support/mocks'

const DESKTOP_WIDTHS = [768, 1440]
const MOBILE_WIDTHS = [390]

async function expectNoHorizontalOverflow(page: Page, screen: string, ready: Locator) {
  await expect(ready).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]:visible')).toHaveCount(0)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `overflow horizontal em ${screen}`).toBeLessThanOrEqual(0)
}

function heading(page: Page, name: string): Locator {
  return page.getByRole('heading', { level: 1, name })
}

for (const width of [...MOBILE_WIDTHS, ...DESKTOP_WIDTHS]) {
  test(`keeps every screen without horizontal overflow at ${width} px`, async ({ page, isMobile }) => {
    test.skip(isMobile !== MOBILE_WIDTHS.includes(width), 'Largura verificada no outro projeto')
    if (!isMobile) {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 })
    }

    await openApp(page, '/')
    await expectNoHorizontalOverflow(page, 'início', page.locator('#catalogo article h3').first())

    await page.goto('/nfts/emerald-ape-042')
    await expectNoHorizontalOverflow(page, 'detalhe', heading(page, 'Emerald Ape #042'))

    await page.goto('/nfts/nft-inexistente')
    await expectNoHorizontalOverflow(page, 'NFT inexistente', page.getByRole('heading', { level: 1 }))

    await page.goto('/rota-inexistente')
    await expectNoHorizontalOverflow(page, 'rota inexistente', heading(page, 'Página não encontrada'))

    await page.goto('/register')
    await expectNoHorizontalOverflow(page, 'cadastro', page.getByLabel('E-mail', { exact: true }))

    await page.goto('/login')
    await expectNoHorizontalOverflow(page, 'login', page.getByLabel('E-mail', { exact: true }))

    await seedGuestCart(page, [EMERALD])
    await page.goto('/cart')
    await expectNoHorizontalOverflow(page, 'carrinho', page.locator('[data-slot="cart-item"]').first())

    await openCheckout(page, [EMERALD])
    await expectNoHorizontalOverflow(page, 'pagamento', page.locator('[data-slot="checkout-line"]').first())

    await connectPrimary(page)
    await openReview(page)
    await expectNoHorizontalOverflow(page, 'revisão do pedido', confirmButton(page))
    await confirmButton(page).click()
    await expect(page).toHaveURL(/\/orders\/order-0001$/)
    await expectNoHorizontalOverflow(page, 'pedido pendente', heading(page, 'Aguardando confirmação do pagamento'))
    await expectNoHorizontalOverflow(page, 'pedido confirmado', heading(page, 'Seus NFTs agora estão na sua carteira'))

    await page.goto('/profile')
    await expectNoHorizontalOverflow(page, 'perfil', page.getByRole('button', { name: 'Salvar', exact: true }))

    await page.goto('/wallets')
    await expectNoHorizontalOverflow(page, 'carteiras', page.getByRole('heading', { level: 2, name: 'Carteira principal' }))
  })
}
