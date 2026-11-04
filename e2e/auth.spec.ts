import { expect, test, type Locator, type Page } from '@playwright/test'
import { openApp, searchParam } from './support/mocks'

const PASSWORD = 'Kurio#2026'
const ANA = { email: 'ana@kurio.test', name: 'Ana Ribeiro', id: 'user-ana' }
const BRUNO = { email: 'bruno@kurio.test', name: 'Bruno Tavares', id: 'user-bruno' }

function formAlert(page: Page): Locator {
  return page.locator('form [role="alert"]').first()
}

function submitButton(page: Page, name: RegExp | string): Locator {
  return page.getByRole('button', { name, exact: true })
}

function accountMenuButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Menu da conta de/ })
}

async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
}

async function signIn(page: Page, user: { email: string }) {
  await fillLogin(page, user.email, PASSWORD)
  await submitButton(page, 'Entrar').click()
}

async function expectSignedInAs(page: Page, name: string) {
  await expect(accountMenuButton(page)).toHaveAccessibleName(`Menu da conta de ${name}`)
}

async function signOut(page: Page) {
  await accountMenuButton(page).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
}

async function realtimeUsers(page: Page): Promise<Array<string | null>> {
  return page.evaluate(() => window.__mocks?.getRealtimeStatus().connections.map((connection) => connection.userId) ?? [])
}

test('validates the login form on the client and associates the errors with the fields', async ({ page, isMobile }) => {
  await openApp(page, '/login')

  if (isMobile) {
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  } else {
    await expect(page.getByRole('dialog', { name: 'Entrar' })).toBeVisible()
  }

  const email = page.getByLabel('E-mail', { exact: true })
  const password = page.getByLabel('Senha', { exact: true })
  await submitButton(page, 'Entrar').click()

  await expect(formAlert(page)).toHaveText('Revise 2 campos: E-mail e Senha.')
  await expect(email).toBeFocused()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Informe o e-mail.')
  await expect(password).toHaveAccessibleDescription('Informe a senha.')

  await email.fill('ana@kurio')
  await expect(email).not.toHaveAttribute('aria-invalid', 'true')
  await password.fill('qualquer')
  await submitButton(page, 'Entrar').click()
  await expect(formAlert(page)).toHaveText('Revise o campo E-mail.')
  await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')
  await expect(email).toBeFocused()
})

test('shows a clear message for invalid credentials', async ({ page }) => {
  await openApp(page, '/login')
  await fillLogin(page, ANA.email, 'SenhaErrada1')
  await submitButton(page, 'Entrar').click()

  await expect(formAlert(page)).toHaveText('E-mail ou senha incorretos. Confira os dados e tente novamente.')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()
  await expect(accountMenuButton(page)).toHaveCount(0)
})

test('validates the register form and shows the e-mail conflict on the field', async ({ page }) => {
  await openApp(page, '/register')
  const submit = submitButton(page, /^Criar (perfil|conta)$/)

  await submit.click()
  await expect(formAlert(page)).toHaveText('Revise 4 campos: Nome de usuário, E-mail, Senha e Confirmar senha.')
  await expect(page.getByLabel('Nome de usuário', { exact: true })).toBeFocused()

  await page.getByLabel('Nome de usuário', { exact: true }).fill('nova_colecionadora')
  await page.getByLabel('E-mail', { exact: true }).fill('ANA@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('curta')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('outra')
  await submit.click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAccessibleDescription(/pelo menos 8 caracteres/)
  await expect(page.getByLabel('Confirmar senha', { exact: true })).toHaveAccessibleDescription('As senhas não conferem.')
  await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()

  await page.getByLabel('Senha', { exact: true }).fill('Colecao2026')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Colecao2026')
  await submit.click()

  const email = page.getByLabel('E-mail', { exact: true })
  await expect(formAlert(page)).toHaveText('Já existe uma conta com este e-mail.')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Este e-mail já está cadastrado.')
  await expect(email).toBeFocused()
  await expect(accountMenuButton(page)).toHaveCount(0)
})

test('creates an account, signs in and follows the redirect', async ({ page }) => {
  await openApp(page, '/register?redirect=%2Fnfts%2Femerald-ape-042')

  await page.getByLabel('Nome de usuário', { exact: true }).fill('carla.mint')
  await page.getByLabel('E-mail', { exact: true }).fill('carla@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('Colecao2026')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Colecao2026')
  await submitButton(page, /^Criar (perfil|conta)$/).click()

  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await page.goto('/')
  await expectSignedInAs(page, 'carla.mint')
})

test('signs in, returns to the redirect with its search and keeps the session after refresh', async ({ page }) => {
  await openApp(page, '/login?redirect=%2Fnfts%2Femerald-ape-042%3Fedition%3Dopen')
  await signIn(page, ANA)

  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042\?edition=open$/)
  await expect(page.getByRole('radio', { name: /^Aberta/ })).toBeChecked()

  await page.goto('/')
  await expectSignedInAs(page, ANA.name)
  await page.reload()
  await expectSignedInAs(page, ANA.name)
  await expect(page.getByRole('link', { name: 'Entrar' })).toHaveCount(0)
})

test('ignores external redirects after login', async ({ page }) => {
  await openApp(page, '/login?redirect=%2F%2Fevil.example')
  await signIn(page, ANA)
  await expect(page).toHaveURL(/\/$/)
  await expectSignedInAs(page, ANA.name)
})

test('redirects private routes to login and comes back after signing in', async ({ page }) => {
  await openApp(page, '/profile')

  await expect(page).toHaveURL(/\/login\?/)
  expect(searchParam(page, 'redirect')).toBe('/profile')
  await signIn(page, ANA)

  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil do colecionador' })).toBeVisible()
})

test('closes the desktop login dialog with Escape and returns focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'O login é uma página inteira no mobile.')
  await openApp(page, '/nfts/emerald-ape-042')

  const trigger = page.getByRole('link', { name: 'Entrar' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()

  await dialog.getByRole('link', { name: 'Criar conta' }).click()
  await expect(page.getByRole('dialog', { name: 'Criar conta' })).toBeVisible()
  expect(searchParam(page, 'redirect')).toBe('/nfts/emerald-ape-042')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/nfts\/emerald-ape-042$/)
  await expect(trigger).toBeFocused()
})

test('ends an expired session during navigation and resumes after signing in again', async ({ page }) => {
  await openApp(page, '/login', { mockPanel: 'visible' })
  await signIn(page, ANA)
  await expectSignedInAs(page, ANA.name)

  await page.getByRole('button', { name: /^Painel de simulação da API/ }).click()
  await page.getByRole('button', { name: 'Expirar sessões' }).click()
  await page.keyboard.press('Escape')

  await accountMenuButton(page).click()
  await page.getByRole('menuitem', { name: 'Dados do perfil' }).click()

  await expect(page).toHaveURL(/\/login\?/)
  expect(searchParam(page, 'redirect')).toBe('/profile')
  expect(searchParam(page, 'reason')).toBe('expired')
  await expect(page.getByRole('alert').filter({ hasText: 'Sua sessão expirou.' })).toBeVisible()
  await expect(accountMenuButton(page)).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('kurio.session'))).toBeNull()

  await signIn(page, ANA)
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil do colecionador' })).toBeVisible()
})

test('logs out and switches from ana to bruno without leaking data', async ({ page }) => {
  await openApp(page, '/login')
  await signIn(page, ANA)
  await expectSignedInAs(page, ANA.name)
  await expect.poll(() => realtimeUsers(page)).toEqual([ANA.id])

  await page.goto('/profile')
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil do colecionador' })).toBeVisible()
  await signOut(page)

  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-live-announcer]')).toHaveText('Você saiu da sua conta.')
  await expect(accountMenuButton(page)).toHaveCount(0)
  await expect.poll(() => realtimeUsers(page)).toEqual([null])
  expect(await page.evaluate(() => localStorage.getItem('kurio.session'))).toBeNull()

  const privateRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/') && request.headers().authorization) {
      privateRequests.push(request.headers().authorization)
    }
  })

  await page.goto('/login')
  await signIn(page, BRUNO)
  await expectSignedInAs(page, BRUNO.name)
  await expect.poll(() => realtimeUsers(page)).toEqual([BRUNO.id])

  await accountMenuButton(page).click()
  const menu = page.getByRole('menu')
  await expect(menu).toContainText(BRUNO.email)
  await expect(menu).not.toContainText(ANA.name)
  await page.keyboard.press('Escape')
  await expect(page.getByText(ANA.name)).toHaveCount(0)

  const brunoToken = await page.evaluate(() => JSON.parse(localStorage.getItem('kurio.session') ?? '{}').token as string)
  expect(privateRequests.every((header) => header === `Bearer ${brunoToken}`)).toBe(true)
})

test('merges the visitor cart on login and reports the adjustments', async ({ page }) => {
  await openApp(page, '/login')

  await page.evaluate(async () => {
    const guestCartId = crypto.randomUUID()
    localStorage.setItem('kurio.guest-cart-id', guestCartId)
    const response = await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Guest-Cart-Id': guestCartId },
      body: JSON.stringify({ nftId: 'neon-vessel-552', editionId: 'limited-50', quantity: 2 }),
    })
    if (!response.ok) {
      throw new Error(`cart ${response.status}`)
    }
    window.__mocks?.updateNft('neon-vessel-552', { editionId: 'limited-50', available: 1 })
  })

  await signIn(page, ANA)
  await expectSignedInAs(page, ANA.name)
  await expect(page.getByText('Seu carrinho foi ajustado')).toBeVisible()
  await expect(page.getByText('Neon Vessel #552 (edição 1/50) foi ajustado para 1 unidade (estoque disponível).')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio.guest-cart-id'))).toBeNull()
})
