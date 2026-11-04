import { expect, test, type Locator, type Page } from '@playwright/test'
import { openApp, setLatency, setScenario } from './support/mocks'

const PASSWORD = 'Kurio#2026'
const ANA = { email: 'ana@kurio.test' }
const BRUNO = { email: 'bruno@kurio.test' }

function announcer(page: Page): Locator {
  return page.locator('[data-live-announcer]')
}

function favoriteButton(page: Page, nftName: string): Locator {
  return page.getByRole('button', { name: new RegExp(`^(Favoritar|Remover) ${nftName.replace('#', '\\#')}( dos favoritos)?$`) })
}

function gridNames(page: Page): Locator {
  return page.locator('[data-slot="catalog-grid"] h3')
}

async function signIn(page: Page, user: { email: string }) {
  await page.getByLabel('E-mail', { exact: true }).fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: /^Menu da conta de/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
}

async function expectFavorite(button: Locator, nftName: string, favorite: boolean) {
  await expect(button).toHaveAttribute('aria-pressed', String(favorite))
  await expect(button).toHaveAccessibleName(favorite ? `Remover ${nftName} dos favoritos` : `Favoritar ${nftName}`)
}

async function openDetailAs(page: Page, nftId: string, user: { email: string }) {
  await openApp(page, `/login?redirect=${encodeURIComponent(`/nfts/${nftId}`)}`)
  await signIn(page, user)
  await expect(page).toHaveURL(new RegExp(`/nfts/${nftId}$`))
}

test('favorites and unfavorites an NFT and keeps the state after refresh', async ({ page }) => {
  await openDetailAs(page, 'sage-nomad-009', ANA)
  const button = favoriteButton(page, 'Sage Nomad #009')
  await expectFavorite(button, 'Sage Nomad #009', false)

  await button.click()
  await expectFavorite(button, 'Sage Nomad #009', true)
  await expect(announcer(page)).toHaveText('Sage Nomad #009 foi adicionado aos favoritos.')

  await page.reload()
  await expectFavorite(button, 'Sage Nomad #009', true)

  await button.click()
  await expectFavorite(button, 'Sage Nomad #009', false)
  await expect(announcer(page)).toHaveText('Sage Nomad #009 foi removido dos favoritos.')

  await page.reload()
  await expectFavorite(button, 'Sage Nomad #009', false)
})

test('rolls back the optimistic update when the mutation fails and recovers on retry', async ({ page }) => {
  await openDetailAs(page, 'sage-nomad-009', ANA)
  const button = favoriteButton(page, 'Sage Nomad #009')
  await expectFavorite(button, 'Sage Nomad #009', false)

  await setLatency(page, 'fixed')
  await setScenario(page, 'favorite-failure')
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')

  await expect(page.getByText('Não foi possível favoritar Sage Nomad #009.')).toBeVisible()
  await expectFavorite(button, 'Sage Nomad #009', false)

  await setScenario(page, 'success')
  await button.click()
  await expectFavorite(button, 'Sage Nomad #009', true)
  await expect(announcer(page)).toHaveText('Sage Nomad #009 foi adicionado aos favoritos.')

  await page.reload()
  await expectFavorite(button, 'Sage Nomad #009', true)
})

test('keeps a consistent state after repeated clicks', async ({ page }) => {
  await openDetailAs(page, 'sage-nomad-009', ANA)
  const button = favoriteButton(page, 'Sage Nomad #009')
  await expectFavorite(button, 'Sage Nomad #009', false)

  await setLatency(page, 'fixed')
  await button.click()
  await button.click()
  await button.click()
  await expectFavorite(button, 'Sage Nomad #009', true)
  await expect(announcer(page)).toHaveText('Sage Nomad #009 foi adicionado aos favoritos.')

  await page.reload()
  await expectFavorite(button, 'Sage Nomad #009', true)
})

test('sends visitors to the login and back to the page they were on', async ({ page }) => {
  await openApp(page, '/nfts/sage-nomad-009')
  await favoriteButton(page, 'Sage Nomad #009').click()

  await expect(page).toHaveURL(/\/login\?redirect=%2Fnfts%2Fsage-nomad-009$/)
  await signIn(page, ANA)
  await expect(page).toHaveURL(/\/nfts\/sage-nomad-009$/)
  await expectFavorite(favoriteButton(page, 'Sage Nomad #009'), 'Sage Nomad #009', false)
})

test('redirects visitors from the favorites list to the login and back', async ({ page }) => {
  await openApp(page, '/?favorites=true')

  await expect(page).toHaveURL(/\/login\?redirect=/)
  expect(new URL(page.url()).searchParams.get('redirect')).toMatch(/^\/\?favorites=true/)
  await signIn(page, ANA)

  await expect(page).toHaveURL(/\/\?favorites=true/)
  await expect(gridNames(page)).toHaveText(['Emerald Ape #042', 'Ivory Baron #088'])
})

test('lists only the favorites of the signed-in user, combined with the catalog filters', async ({ page, isMobile }) => {
  await openApp(page, '/login')
  await signIn(page, ANA)

  if (isMobile) {
    await page.getByRole('link', { name: 'Favoritos' }).click()
  } else {
    await page.getByRole('link', { name: 'Lista de interesse' }).click()
  }
  await expect(page).toHaveURL(/\/\?favorites=true#catalogo$/)
  await expect(page.getByText('Mostrando apenas os seus favoritos.')).toBeVisible()
  await expect(gridNames(page)).toHaveText(['Emerald Ape #042', 'Ivory Baron #088'])

  const requests: Array<{ url: URL; authorization?: string }> = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/api/nfts') {
      requests.push({ url, authorization: request.headers().authorization })
    }
  })
  await page.goto('/?favorites=true&category=collectibles&sort=price-asc')
  await expect(gridNames(page)).toHaveText(['Ivory Baron #088'])
  const favoritesRequest = requests.find(({ url }) => url.searchParams.get('favorites') === 'true')
  expect(favoritesRequest?.url.searchParams.get('category')).toBe('collectibles')
  expect(favoritesRequest?.url.searchParams.get('sort')).toBe('price-asc')
  expect(favoritesRequest?.authorization).toMatch(/^Bearer /)

  await page.goto('/?favorites=true&q=golden')
  await expect(page.getByRole('heading', { name: 'Nenhum favorito encontrado' })).toBeVisible()

  await page.goto('/?favorites=true')
  if (isMobile) {
    const cardButton = favoriteButton(page, 'Emerald Ape #042')
    await expectFavorite(cardButton, 'Emerald Ape #042', true)
    await cardButton.click()
    await expect(announcer(page)).toHaveText('Emerald Ape #042 foi removido dos favoritos.')
    await expect(gridNames(page)).toHaveText(['Ivory Baron #088'])
  }

  await page.getByRole('button', { name: 'Ver todo o catálogo' }).click()
  await expect(page).not.toHaveURL(/favorites=/)
  await expect(gridNames(page)).toHaveCount(9)
})

test('keeps favorites isolated between ana and bruno', async ({ page }) => {
  await openApp(page, '/login?redirect=%2F%3Ffavorites%3Dtrue')
  await signIn(page, ANA)
  await expect(gridNames(page)).toHaveText(['Emerald Ape #042', 'Ivory Baron #088'])

  await signOut(page)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Mostrando apenas os seus favoritos.')).toHaveCount(0)

  await page.goto('/login?redirect=%2F%3Ffavorites%3Dtrue')
  await signIn(page, BRUNO)
  await expect(gridNames(page)).toHaveText(['Golden Beat #207'])

  await page.goto('/nfts/emerald-ape-042')
  await expectFavorite(favoriteButton(page, 'Emerald Ape #042'), 'Emerald Ape #042', false)

  await page.goto('/nfts/golden-beat-207')
  const golden = favoriteButton(page, 'Golden Beat #207')
  await expectFavorite(golden, 'Golden Beat #207', true)
  await golden.click()
  await expect(announcer(page)).toHaveText('Golden Beat #207 foi removido dos favoritos.')

  await page.goto('/?favorites=true')
  await expect(page.getByRole('heading', { name: 'Você ainda não tem favoritos' })).toBeVisible()
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
  await expect(page).not.toHaveURL(/favorites=/)

  await signOut(page)
  await page.goto('/login?redirect=%2F%3Ffavorites%3Dtrue')
  await signIn(page, ANA)
  await expect(gridNames(page)).toHaveText(['Emerald Ape #042', 'Ivory Baron #088'])
})
