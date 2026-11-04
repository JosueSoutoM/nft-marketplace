import { expect, test, type Locator, type Page } from '@playwright/test'
import { openApp, searchParam, setScenario } from './support/mocks'

const FIRST_PAGE = [
  'Emerald Ape #042',
  'Sage Nomad #009',
  'Neon Vessel #552',
  'Cosmic Bloom #118',
  'Violet Nomad #314',
  'Ivory Baron #088',
  'Golden Beat #207',
  'Golden Frequency #071',
  'Golden Signal #160',
]

const MUSIC = [
  'Golden Beat #207',
  'Golden Frequency #071',
  'Golden Signal #160',
  'Bass Prophet #333',
  'Lo-Fi Monk #128',
  'Echo Chamber #348',
]

function cardNames(page: Page): Locator {
  return page.locator('#catalogo article h3')
}

function announcer(page: Page): Locator {
  return page.locator('[data-live-announcer]')
}

async function openFilters(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) {
    return page.getByRole('complementary', { name: 'Filtros do catálogo' })
  }
  await page.getByRole('button', { name: 'Abrir filtros' }).click()
  const dialog = page.getByRole('dialog', { name: 'Filtros' })
  await expect(dialog).toBeVisible()
  return dialog
}

async function closeFilters(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: /^Ver \d+ resultados?$/ }).click()
    await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeHidden()
  }
}

async function chooseSort(page: Page, label: string) {
  await page.getByRole('combobox', { name: /Ordenar por/ }).click()
  await page.getByRole('option', { name: label }).click()
}

test('lists the first catalog page with featured highlights from the API', async ({ page, isMobile }) => {
  await openApp(page)

  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /Mostrar destaque 1 de 3: Emerald Ape #042/ })).toBeVisible()
  if (!isMobile) {
    await expect(page.getByRole('region', { name: 'NFT em destaque' }).getByRole('img')).toHaveAttribute(
      'alt',
      /Sage Nomad #009/,
    )
  }
  await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toBeVisible()
})

test('combines filters and sort in the URL and restores them through history', async ({ page, isMobile }) => {
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  let filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Música/ }).click()
  await expect(cardNames(page)).toHaveText(MUSIC)
  await expect(filters.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'true')
  await filters.getByRole('button', { name: /^Ethereum/ }).click()
  await closeFilters(page, isMobile)

  await expect(cardNames(page)).toHaveText(['Golden Beat #207', 'Bass Prophet #333'])
  await expect(announcer(page)).toHaveText('2 NFTs encontrados.')
  expect(new URL(page.url()).search).toBe('?category=music&network=ethereum')

  await chooseSort(page, 'Maior preço')
  await expect(cardNames(page)).toHaveText(['Bass Prophet #333', 'Golden Beat #207'])
  expect(searchParam(page, 'sort')).toBe('price-desc')

  await page.goBack()
  await expect(cardNames(page)).toHaveText(['Golden Beat #207', 'Bass Prophet #333'])
  expect(searchParam(page, 'sort')).toBeNull()

  await page.goBack()
  await expect(cardNames(page)).toHaveText(MUSIC)
  expect(searchParam(page, 'network')).toBeNull()

  await page.goForward()
  await page.goForward()
  await expect(cardNames(page)).toHaveText(['Bass Prophet #333', 'Golden Beat #207'])

  await page.reload()
  await page.waitForFunction(() => '__mocks' in window)
  await expect(cardNames(page)).toHaveText(['Bass Prophet #333', 'Golden Beat #207'])
  await expect(page.getByRole('combobox', { name: /Ordenar por/ })).toContainText('Maior preço')

  filters = await openFilters(page, isMobile)
  await expect(filters.getByRole('button', { name: /^Ethereum/ })).toHaveAttribute('aria-pressed', 'true')
})

test('paginates and resets the page when a filter changes', async ({ page, isMobile }) => {
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(cardNames(page).first()).toHaveText('Jade Monarch #013')
  expect(searchParam(page, 'page')).toBe('2')
  await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'Próxima página' }).click()
  expect(searchParam(page, 'page')).toBe('3')

  await page.goBack()
  await expect(cardNames(page).first()).toHaveText('Jade Monarch #013')

  const filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Fotografia/ }).click()
  await closeFilters(page, isMobile)
  await expect(cardNames(page).first()).toHaveText('Velvet Drifter #402')
  expect(searchParam(page, 'page')).toBeNull()

  await page.getByRole('button', { name: 'Em alta' }).click()
  await expect(page.getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')
  expect(searchParam(page, 'segment')).toBe('trending')
})

test('debounces the search into a single history entry', async ({ page, isMobile }) => {
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  if (isMobile) {
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).pressSequentially('emerald', { delay: 40 })
  } else {
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('searchbox', { name: /Buscar NFTs/ }).pressSequentially('emerald', { delay: 40 })
  }

  await expect.poll(() => searchParam(page, 'q')).toBe('emerald')
  await expect(cardNames(page)).toHaveText(['Emerald Ape #042', 'Emerald Heir #043'])
  await expect(announcer(page)).toHaveText('2 NFTs encontrados.')

  await page.goBack()
  await expect.poll(() => searchParam(page, 'q')).toBeNull()
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
})

test('header search from another page opens the catalog with q filled', async ({ page, isMobile }) => {
  test.skip(isMobile, 'O header só existe a partir de 768 px')
  await openApp(page, '/cart')

  await page.getByRole('button', { name: 'Buscar NFTs' }).click()
  const field = page.getByRole('searchbox', { name: /Buscar NFTs/ })
  await field.fill('emerald')
  await field.press('Enter')

  await expect(page).toHaveURL(/\/\?q=emerald#catalogo$/)
  await expect(cardNames(page)).toHaveText(['Emerald Ape #042', 'Emerald Heir #043'])
})

test('shows the empty state and clears the filters', async ({ page }) => {
  await openApp(page, '/?q=inexistente')

  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
  expect(searchParam(page, 'q')).toBeNull()
})

test('shows the empty catalog scenario', async ({ page }) => {
  await openApp(page, '/', { scenario: 'empty-catalog' })

  await expect(page.getByRole('heading', { name: 'Nenhum NFT disponível' })).toBeVisible()
  await expect(cardNames(page)).toHaveCount(0)
})

test('shows an error and recovers with a new attempt', async ({ page }) => {
  await openApp(page, '/', { scenario: 'server-error' })

  const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })
  await expect(alert).toBeVisible({ timeout: 15_000 })

  await setScenario(page, 'success')
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
})

test('shows skeletons while the catalog loads slowly without layout shift', async ({ page }) => {
  await openApp(page, '/', { latency: 'slow' })

  const grid = page.locator('[data-slot="catalog-grid"]')
  const skeletons = grid.locator('[data-slot="skeleton"]')
  await expect(skeletons.first()).toBeVisible()
  const skeletonCell = await grid.locator(':scope > *').first().boundingBox()

  await expect(cardNames(page)).toHaveText(FIRST_PAGE, { timeout: 10_000 })
  await expect(skeletons).toHaveCount(0)
  const cardCell = await grid.locator(':scope > *').first().boundingBox()
  expect(skeletonCell).not.toBeNull()
  expect(Math.round(cardCell?.y ?? 0)).toBe(Math.round(skeletonCell?.y ?? -1))
  expect(Math.round(cardCell?.width ?? 0)).toBe(Math.round(skeletonCell?.width ?? -1))
  expect(Math.round(cardCell?.height ?? 0)).toBe(Math.round(skeletonCell?.height ?? -1))
})

test('keeps the latest parameters when responses arrive out of order', async ({ page, isMobile }) => {
  await openApp(page, '/', { scenario: 'variable-latency' })
  await expect(cardNames(page)).toHaveText(FIRST_PAGE, { timeout: 10_000 })

  const filters = await openFilters(page, isMobile)
  for (const label of [/^Fotografia/, /^Jogos/, /^Música/, /^Fotografia/, /^Jogos/]) {
    await filters.getByRole('button', { name: label }).click()
  }
  await closeFilters(page, isMobile)

  expect(searchParam(page, 'category')).toBe('music')
  await expect(cardNames(page)).toHaveText(MUSIC, { timeout: 10_000 })
  await page.waitForTimeout(2_500)
  await expect(cardNames(page)).toHaveText(MUSIC)
})

test('falls back to defaults for invalid search params', async ({ page }) => {
  await openApp(page, '/?page=abc&sort=bogus&segment=x&priceMin=-1&category=%5B%22nope%22%5D')

  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
  await expect(page.getByRole('combobox', { name: /Ordenar por/ })).toContainText('Listados recentemente')
  expect(new URL(page.url()).search).toBe('')
})

test('keeps list filters readable in the URL with comma separated values', async ({ page, isMobile }) => {
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  const filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Música/ }).click()
  await filters.getByRole('button', { name: /^Fotografia/ }).click()
  await filters.getByRole('button', { name: /^Ethereum/ }).click()
  await closeFilters(page, isMobile)

  await expect.poll(() => new URL(page.url()).search).toBe('?category=photography,music&network=ethereum')
  const expected = ['Golden Beat #207', 'Bass Prophet #333', 'Lens Wanderer #063', 'Silver Frame #271']
  await expect(cardNames(page)).toHaveText(expected)

  await page.reload()
  await page.waitForFunction(() => '__mocks' in window)
  await expect(cardNames(page)).toHaveText(expected)
  expect(new URL(page.url()).search).toBe('?category=photography,music&network=ethereum')

  await page.goBack()
  await expect.poll(() => searchParam(page, 'network')).toBeNull()
  expect(searchParam(page, 'category')).toBe('photography,music')
})

test('accepts list filters typed directly in the URL, including the legacy JSON format', async ({ page }) => {
  await openApp(page, '/?category=music,unknown&network=ethereum')
  await expect(cardNames(page)).toHaveText(['Golden Beat #207', 'Bass Prophet #333'])
  expect(new URL(page.url()).search).toBe('?category=music&network=ethereum')

  await openApp(page, '/?category=%5B%22music%22%5D&network=%5B%22ethereum%22%5D')
  await expect(cardNames(page)).toHaveText(['Golden Beat #207', 'Bass Prophet #333'])
  await chooseSort(page, 'Maior preço')
  await expect(cardNames(page)).toHaveText(['Bass Prophet #333', 'Golden Beat #207'])
  expect(new URL(page.url()).search).toBe('?category=music&network=ethereum&sort=price-desc')
})

test('places the mock panel trigger where it covers no content', async ({ page }) => {
  await openApp(page, '/', { mockPanel: 'visible' })
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  const trigger = page.getByRole('button', { name: /Painel de simulação da API/ })
  await expect(trigger).toBeVisible()
  const overlaps = await trigger.evaluate((button) => {
    const box = button.getBoundingClientRect()
    return [...document.querySelectorAll('#root *')]
      .filter((element) => !element.closest('[data-mock-panel]') && element.children.length === 0)
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          !element.classList.contains('sr-only') &&
          rect.left < box.right &&
          rect.right > box.left &&
          rect.top < box.bottom &&
          rect.bottom > box.top
        )
      })
      .map((element) => element.outerHTML.slice(0, 80))
  })
  expect(overlaps).toEqual([])

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(trigger).not.toBeInViewport()
})

test('hides the mock panel when the test flag is active', async ({ page }) => {
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
  await expect(page.locator('[data-mock-panel]')).toHaveCount(0)
})

test('returns focus to the trigger when the filters drawer closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'O drawer de filtros é usado abaixo de 1024 px')
  await openApp(page)

  const trigger = page.getByRole('button', { name: 'Abrir filtros' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('updates the card price from a Socket.IO event without reloading', async ({ page }) => {
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
  await page.waitForFunction(() => (window.__mocks?.getRealtimeStatus().connections.length ?? 0) > 0)
  const card = page.locator('#catalogo article').filter({ hasText: 'Emerald Ape #042' })
  await expect(card).toContainText('1.19 ETH')
  const navigationStart = await page.evaluate(() => performance.timeOrigin)

  await page.evaluate(() => window.__mocks?.updateNft('emerald-ape-042', { price: '1.29' }))

  await expect(card).toContainText('1.29 ETH')
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(navigationStart)
})

test('keeps the favorites param reserved without changing the list', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/nfts') {
      requests.push(request.url())
    }
  })
  await openApp(page, '/?favorites=true')

  await expect(cardNames(page)).toHaveText(FIRST_PAGE)
  expect(searchParam(page, 'favorites')).toBe('true')
  expect(requests.length).toBeGreaterThan(0)
  expect(requests.every((url) => !url.includes('favorites'))).toBe(true)
})

test('has no horizontal overflow at 768 px', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Verificado no projeto desktop com viewport de tablet')
  await page.setViewportSize({ width: 768, height: 1024 })
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('reaches search, filters, segments, sort, cards and pagination with visible focus', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'No mobile os filtros ficam no drawer, coberto em outro teste')
  await openApp(page)
  await expect(cardNames(page)).toHaveText(FIRST_PAGE)

  await page.getByRole('button', { name: 'Buscar NFTs' }).focus()
  const visited: string[] = []
  for (let step = 0; step < 80; step += 1) {
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null
      if (!element || element === document.body) {
        return null
      }
      const style = getComputedStyle(element)
      const label =
        element.getAttribute('aria-label') ??
        (element.getAttribute('role') === 'combobox' ? 'combobox' : null) ??
        element.getAttribute('href') ??
        element.textContent?.trim() ??
        ''
      return { label, visible: style.outlineStyle !== 'none' && style.outlineWidth !== '0px' }
    })
    if (focused) {
      expect(focused.visible, `foco visível em "${focused.label}"`).toBe(true)
      visited.push(focused.label)
    }
    if (focused?.label === 'Página 2') {
      break
    }
    await page.keyboard.press('Tab')
  }

  const sortPosition = visited.indexOf('combobox')
  const order = [
    visited.indexOf('Buscar NFTs'),
    visited.findIndex((label) => label.startsWith('Arte digital')),
    visited.findIndex((label) => label.startsWith('Ethereum')),
    visited.indexOf('Novos lançamentos'),
    sortPosition,
    visited.indexOf('/nfts/emerald-ape-042', sortPosition),
    visited.indexOf('Página 2'),
  ]
  expect(order.every((position) => position >= 0), visited.join(' | ')).toBe(true)
  expect([...order].sort((left, right) => left - right)).toEqual(order)
})
