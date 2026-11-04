import { expect, test, type Locator, type Page } from '@playwright/test'
import { openApp, searchParam, setScenario } from './support/mocks'

function announcer(page: Page): Locator {
  return page.locator('[data-live-announcer]')
}

function price(page: Page): Locator {
  return page.locator('[data-slot="nft-price"]:visible')
}

function quantityInput(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Quantidade' })
}

function edition(page: Page, label: string): Locator {
  return page.getByRole('radio', { name: new RegExp(`^${label.replace('/', '\\/')}( ?,|$)`) })
}

async function chooseEdition(page: Page, label: string) {
  await page.locator('label').filter({ has: edition(page, label) }).click()
}

async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => (window.__mocks?.getRealtimeStatus().connections.length ?? 0) > 0)
}

test('opens the detail by direct access with data from the API', async ({ page, isMobile }) => {
  await openApp(page, '/nfts/emerald-ape-042')

  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(price(page)).toContainText('1.19 ETH')
  await expect(edition(page, '1/50')).toBeChecked()
  await expect(page.getByText('Coleção: Kurio Apes', { exact: true })).toBeVisible()
  await expect(page.getByText('Criador: Nova Sato')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Avaliações.*\(19\)/ })).toBeVisible()

  const collection = page.getByRole('region', { name: /Mais desta coleção/ })
  await expect(collection.getByRole('article').first()).toBeVisible()
  await expect(collection.getByRole('article').filter({ hasText: 'Emerald Ape #042' })).toHaveCount(0)
  await expect(collection.getByRole('article').filter({ hasText: 'Jade Monarch #013' })).toHaveCount(1)

  if (isMobile) {
    await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0)
  } else {
    const thumbnails = page.getByRole('list', { name: 'Imagens do NFT' }).getByRole('button')
    await expect(thumbnails).toHaveCount(4)
    await expect(thumbnails.first()).toHaveAttribute('aria-pressed', 'true')
    await thumbnails.nth(2).click()
    await expect(thumbnails.nth(2)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('img[fetchpriority="high"]')).toHaveAttribute('alt', /imagem 3 de 4/)

    const shareUrl = encodeURIComponent(new URL('/nfts/emerald-ape-042', page.url()).href)
    for (const name of ['Compartilhar no LinkedIn (abre em nova aba)', 'Compartilhar no Twitter (abre em nova aba)']) {
      const link = page.getByRole('link', { name })
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link).toHaveAttribute('href', new RegExp(`^https://[^?]+\\?.*url=${shareUrl.replace(/[.%]/g, '\\$&')}`))
    }
    const email = page.getByRole('link', { name: 'Compartilhar por e-mail' })
    await expect(email).toHaveAttribute('href', /^mailto:\?subject=/)
    await expect(email).not.toHaveAttribute('target', /.+/)
  }

  await page.getByRole('tab', { name: /Avaliações/ }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Mostrando as 3 avaliações mais recentes de 19.')
})

test('preloads the detail on card intent and keeps the chosen edition after refresh', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover intent only exists on desktop')
  await openApp(page)
  const detailRequest = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/nfts/emerald-ape-042')
  await page.locator('#catalogo article').filter({ hasText: 'Emerald Ape #042' }).getByRole('link').hover()
  await detailRequest

  await page.locator('#catalogo article').filter({ hasText: 'Emerald Ape #042' }).getByRole('link').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()

  await chooseEdition(page, '1/10')
  await expect(price(page)).toContainText('2.38 ETH')
  expect(searchParam(page, 'edition')).toBe('limited-10')

  await page.reload()
  await page.waitForFunction(() => '__mocks' in window)
  await expect(edition(page, '1/10')).toBeChecked()
  await expect(price(page)).toContainText('2.38 ETH')
})

test('keeps the edition from the URL on refresh', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042?edition=open')
  await expect(edition(page, 'Aberta')).toBeChecked()
  await expect(price(page)).toContainText('0.595 ETH')

  await page.reload()
  await page.waitForFunction(() => '__mocks' in window)
  await expect(edition(page, 'Aberta')).toBeChecked()
  expect(searchParam(page, 'edition')).toBe('open')
})

test('shows the not found state for an unknown NFT and links back to the catalog', async ({ page }) => {
  await openApp(page, '/nfts/does-not-exist-000')

  await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
  await expect(page).toHaveURL(/\/#catalogo$/)
  await expect(page.locator('#catalogo article').first()).toBeVisible()
})

test('recovers from a server error with a retry', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042', { scenario: 'server-error' })

  const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar este NFT' })
  await expect(alert).toBeVisible({ timeout: 15_000 })
  await setScenario(page, 'success')
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
})

test('shows a skeleton while the detail loads slowly', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042', { latency: 'slow' })
  await expect(page.getByText('Carregando NFT…')).toBeAttached()
  await expect(page.locator('[data-slot="skeleton"]').first()).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Carregando NFT…')).toHaveCount(0)
})

test('marks sold out editions as unavailable with a visible reason', async ({ page }) => {
  await openApp(page, '/nfts/sage-nomad-009')

  await expect(edition(page, '1/1')).toBeDisabled()
  await expect(edition(page, '1/10')).toBeDisabled()
  await expect(edition(page, '1/50')).toBeEnabled()
  await expect(edition(page, '1/50')).toBeChecked()
  await expect(page.getByText('Esgotadas: 1/1, 1/10.')).toBeVisible()
  await expect(edition(page, '1/1')).toHaveAccessibleDescription('Esgotadas: 1/1, 1/10.')

  await openApp(page, '/nfts/sage-nomad-009?edition=unique')
  await expect(edition(page, '1/1')).toBeChecked()
  await expect(page.locator('[data-slot="quantity-limit"]:visible')).toHaveText('A edição 1/1 está esgotada.')
  await expect(quantityInput(page)).toBeDisabled()
})

test('limits the quantity to the edition availability and explains why', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042?edition=limited-10')
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
  const decrease = page.getByRole('button', { name: 'Diminuir quantidade' })

  await expect(decrease).toHaveAttribute('aria-disabled', 'true')
  await increase.click()
  await increase.click()
  await expect(quantityInput(page)).toHaveValue('3')
  await expect(increase).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('[data-slot="quantity-limit"]:visible')).toHaveText('Só restam 3 unidades da edição 1/10.')
  await expect(quantityInput(page)).toHaveAccessibleDescription('Só restam 3 unidades da edição 1/10.')

  await increase.press('Enter')
  await expect(quantityInput(page)).toHaveValue('3')
  await expect(announcer(page)).toContainText('Só restam 3 unidades da edição 1/10.')

  await chooseEdition(page, '1/50')
  await quantityInput(page).fill('50')
  await expect(quantityInput(page)).toHaveValue('10')
  await expect(page.locator('[data-slot="quantity-limit"]:visible')).toHaveText(
    'Limite de 10 unidades por pedido na edição 1/50.',
  )
  await decrease.click()
  await expect(quantityInput(page)).toHaveValue('9')
  await expect(page.locator('[data-slot="quantity-limit"]:visible')).toHaveCount(0)
})

test('updates price and availability from nft.updated and corrects the quantity', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042')
  await expect(price(page)).toContainText('1.19 ETH')
  await waitForRealtime(page)

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', price: '1.31' }))
  await expect(price(page)).toContainText('1.31 ETH')
  await expect(announcer(page)).toContainText('mudou de 1.19 ETH para 1.31 ETH')

  await quantityInput(page).fill('5')
  await expect(quantityInput(page)).toHaveValue('5')
  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', available: 2 }))
  await expect(quantityInput(page)).toHaveValue('2')
  await expect(page.getByText('Disponível: 2 de 50 na edição 1/50')).toBeVisible()
  await expect(announcer(page)).toContainText('A quantidade foi ajustada para 2.')

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { editionId: 'limited-50', available: 0 }))
  await expect(page.getByText('Disponível: 0 de 50 na edição 1/50')).toBeVisible()
  await expect(announcer(page)).toContainText('A edição 1/50 esgotou.')
  await expect(quantityInput(page)).toBeDisabled()
})
