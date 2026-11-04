import { expect, test, type Locator, type Page } from '@playwright/test'
import { ANA, EMERALD, IVORY, seedGuestCart, signIn } from './support/checkout'
import { openApp } from './support/mocks'

const FIXED_NOW = new Date('2026-11-04T15:00:00.000Z')

function volatile(page: Page): Locator[] {
  return [page.locator('time'), page.locator('[data-slot="checkout-quote-expiry"]')]
}

async function openStable(page: Page, path: string) {
  await page.clock.setFixedTime(FIXED_NOW)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page, '/')
  await page.evaluate(() => window.__mocks?.reset())
  await openApp(page, path)
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(async () => {
    for (const image of Array.from(document.images)) {
      image.scrollIntoView({ block: 'center', inline: 'center' })
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
    for (const element of Array.from(document.querySelectorAll('*'))) {
      if (element.scrollLeft > 0) {
        element.scrollLeft = 0
      }
    }
    window.scrollTo(0, 0)
  })
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((image) => image.getClientRects().length > 0)
      .every((image) => image.complete && image.naturalWidth > 0),
  )
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0)
}

async function snapshot(page: Page, name: string) {
  await settle(page)
  await expect(page).toHaveScreenshot(name, { fullPage: true, animations: 'disabled', caret: 'hide', mask: volatile(page) })
}

test.describe('visual regression', () => {
  test('home', async ({ page }) => {
    await openStable(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await snapshot(page, 'home.png')
  })

  test('nft detail', async ({ page }) => {
    await openStable(page, `/nfts/${EMERALD.nftId}`)
    await expect(page.getByRole('heading', { level: 1, name: /Emerald Ape #042/ })).toBeVisible()
    await snapshot(page, 'nft-detail.png')
  })

  test('cart with items', async ({ page }) => {
    await openStable(page, '/')
    await seedGuestCart(page, [EMERALD, IVORY])
    await page.goto('/cart')
    await expect(page.locator('[data-slot="cart-item"]')).toHaveCount(2)
    await expect(page.locator('[data-slot="summary-total"]')).toHaveText(/ETH/)
    await snapshot(page, 'cart.png')
  })

  test('checkout signed in as ana', async ({ page }) => {
    await openStable(page, '/')
    await seedGuestCart(page, [EMERALD])
    await page.goto('/login?redirect=%2Fcheckout')
    await signIn(page, ANA.email)
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.locator('[data-slot="checkout-line"]')).toHaveCount(1)
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(ANA.name)
    await expect(page.locator('[data-slot="checkout-total"]')).toHaveText('2.396 ETH')
    await expect(page.locator('[data-slot="wallet-option"]').first()).toBeVisible()
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0)
    await snapshot(page, 'checkout.png')
  })
})
