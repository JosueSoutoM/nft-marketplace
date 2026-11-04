import { expect, test, type Locator, type Page } from '@playwright/test'
import { ANA, BRUNO, PASSWORD, signIn } from './support/checkout'
import { openApp, setScenario } from './support/mocks'

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
const SOLANA_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV'

async function openAccount(page: Page, path: '/profile' | '/wallets', user: { email: string } = ANA) {
  await openApp(page, '/')
  await page.goto(`/login?redirect=${encodeURIComponent(path)}`)
  await signIn(page, user.email)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
}

function field(scope: Page | Locator, label: string): Locator {
  return scope.getByRole('textbox', { name: label, exact: true })
}

function formAlert(scope: Page | Locator): Locator {
  return scope.locator('[role="alert"]').filter({ hasText: /\S/ }).first()
}

function saveProfile(page: Page): Locator {
  return page.getByRole('button', { name: 'Salvar', exact: true })
}

function profileStatus(page: Page): Locator {
  return page.locator('form output')
}

async function chooseOption(scope: Locator, label: string, option: string) {
  await scope.getByRole('combobox', { name: label }).click()
  await scope.page().getByRole('option', { name: option, exact: true }).click()
}

test('links profile and wallets through the side menu', async ({ page }) => {
  await openAccount(page, '/profile')
  const menu = page.getByRole('navigation', { name: 'Meu perfil' })
  await expect(menu.getByRole('link', { name: 'Dados do perfil' })).toHaveAttribute('aria-current', 'page')

  await menu.getByRole('link', { name: 'Carteiras' }).click()
  await expect(page).toHaveURL(/\/wallets$/)
  await expect(menu.getByRole('link', { name: 'Carteiras' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { level: 2, name: 'Carteira principal' })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('validates the profile on the client and shows the API field errors', async ({ page }) => {
  await openAccount(page, '/profile')
  const displayName = field(page, 'Nome de exibição')
  const email = field(page, 'E-mail')
  await expect(displayName).toHaveValue(ANA.name)

  await displayName.fill('')
  await email.fill('ana@kurio')
  await saveProfile(page).click()

  await expect(formAlert(page)).toHaveText('Revise 2 campos: Nome de exibição e E-mail.')
  await expect(displayName).toBeFocused()
  await expect(displayName).toHaveAttribute('aria-invalid', 'true')
  await expect(displayName).toHaveAccessibleDescription('Informe o nome de exibição.')
  await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')

  await displayName.fill('Ana Souza')
  await email.fill(BRUNO.email)
  await saveProfile(page).click()
  await expect(formAlert(page)).toHaveText('Já existe uma conta com este e-mail.')
  await expect(email).toBeFocused()
  await expect(email).toHaveAccessibleDescription('Este e-mail já está cadastrado.')

  await email.fill(ANA.email)
  await setScenario(page, 'form-validation')
  await saveProfile(page).click()
  const username = field(page, 'Nome de usuário')
  await expect(username).toBeFocused()
  await expect(username).toHaveAccessibleDescription('Este nome de usuário é reservado pela plataforma.')

  await page.reload()
  await expect(displayName).toHaveValue(ANA.name)
})

test('saves the profile and keeps it after refresh', async ({ page }) => {
  await openAccount(page, '/profile')
  await field(page, 'Nome de exibição').fill('Ana R. Souza')
  await field(page, 'Nome ENS').fill('ana-souza')
  await field(page, 'Apelido da carteira').fill('Cofre principal')

  const save = saveProfile(page)
  await save.click()
  await expect(profileStatus(page)).toHaveText('Dados do perfil salvos.')
  await expect(page.getByRole('button', { name: 'Menu da conta de Ana R. Souza' })).toBeVisible()

  await page.reload()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana R. Souza')
  await expect(field(page, 'Nome ENS')).toHaveValue('ana-souza')
  await expect(field(page, 'Apelido da carteira')).toHaveValue('Cofre principal')
})

test('validates, previews, uploads and removes the avatar', async ({ page }) => {
  await openAccount(page, '/profile')
  const input = page.getByTestId('avatar-input')
  const change = page.getByRole('button', { name: 'Alterar', exact: true })

  await input.setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('texto') })
  await expect(change).toHaveAccessibleDescription(/Use uma imagem PNG, JPEG ou WebP\./)
  await expect(change).toBeFocused()

  await input.setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.concat([PNG_BYTES, Buffer.alloc(600 * 1024)]) })
  await expect(change).toHaveAccessibleDescription(/A imagem deve ter até 512 KB\./)

  await input.setInputFiles({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('nao e imagem') })
  await expect(page.getByRole('img', { name: 'Prévia do novo avatar' })).toBeVisible()
  await saveProfile(page).click()
  await expect(change).toHaveAccessibleDescription(/O conteúdo do arquivo não corresponde a uma imagem válida\./)
  await expect(change).toBeFocused()

  await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_BYTES })
  await expect(page.getByText('Prévia de avatar.png. Clique em Salvar para aplicar.')).toBeVisible()
  await saveProfile(page).click()
  await expect(profileStatus(page)).toHaveText('Avatar atualizado.')

  await page.reload()
  await expect(page.getByRole('img', { name: 'Avatar atual' })).toHaveAttribute('src', /^data:image\/png;base64,/)

  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(page.getByText('O avatar será removido ao salvar.')).toBeVisible()
  await saveProfile(page).click()
  await expect(profileStatus(page)).toHaveText('Avatar removido.')

  await page.reload()
  await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
})

test('rejects a wrong current password and then changes the password', async ({ page }) => {
  await openAccount(page, '/profile')
  const current = field(page, 'Senha atual')
  const next = field(page, 'Nova senha')
  const confirmation = field(page, 'Confirmar nova senha')

  await next.fill('NovaSenha2027')
  await saveProfile(page).click()
  await expect(current).toBeFocused()
  await expect(current).toHaveAccessibleDescription('Informe a senha atual.')
  await expect(confirmation).toHaveAccessibleDescription('Confirme a senha.')

  await current.fill('SenhaErrada1')
  await confirmation.fill('NovaSenha2027')
  await saveProfile(page).click()
  await expect(formAlert(page)).toHaveText('Senha atual incorreta.')
  await expect(current).toBeFocused()
  await expect(current).toHaveAttribute('aria-invalid', 'true')

  await current.fill(PASSWORD)
  const save = saveProfile(page)
  await save.click()
  await expect(profileStatus(page)).toHaveText('Senha alterada.')
  await expect(current).toHaveValue('')
  await expect(next).toHaveValue('')

  await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('button', { name: 'Sair' }).click()
  await page.goto('/login?redirect=%2Fprofile')
  await field(page, 'E-mail').fill(ANA.email)
  await field(page, 'Senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.locator('form [role="alert"]').first()).toHaveText('E-mail ou senha incorretos. Confira os dados e tente novamente.')

  await field(page, 'Senha').fill('NovaSenha2027')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/profile$/)
})

test('edits the primary wallet with address validation per network and keeps it after refresh', async ({ page }) => {
  await openAccount(page, '/wallets')
  await page.getByRole('button', { name: 'Editar carteira principal' }).click()
  const form = page.getByRole('form', { name: 'Carteira principal' })
  const displayName = field(form, 'Nome de exibição')
  await expect(displayName).toBeFocused()
  const address = field(form, 'Endereço da carteira')

  await address.fill('0x123')
  await form.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(address).toBeFocused()
  await expect(address).toHaveAttribute('aria-invalid', 'true')
  await expect(address).toHaveAccessibleDescription('Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.')

  await chooseOption(form, 'Rede', 'Solana')
  await address.fill('0x3fA94c2E8b1D7a6C05e9B4f2d18A7c3E6b90D41a')
  await form.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(address).toHaveAccessibleDescription('Endereço Solana inválido: use de 32 a 44 caracteres base58.')

  await address.fill(SOLANA_ADDRESS)
  await setScenario(page, 'form-validation')
  await form.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(address).toBeFocused()
  await expect(address).toHaveAccessibleDescription('Endereço não reconhecido na rede selecionada.')

  await setScenario(page, 'success')
  await form.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(form).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar carteira principal' })).toBeFocused()
  const summary = page.locator('[data-slot="wallet-summary"]').first()
  await expect(summary).toContainText(SOLANA_ADDRESS)
  await expect(summary).toContainText('Solana')

  await page.reload()
  await expect(page.locator('[data-slot="wallet-summary"]').first()).toContainText(SOLANA_ADDRESS)
})

test('adds a secondary wallet, mirrors the primary and keeps it after refresh', async ({ page }) => {
  await openAccount(page, '/wallets', BRUNO)
  await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar carteira secundária' }).click()
  const form = page.getByRole('form', { name: 'Carteira secundária' })
  await expect(field(form, 'Nome de exibição')).toHaveValue(BRUNO.name)

  const submit = form.getByRole('button', { name: 'Salvar carteira' })
  await submit.click()
  await expect(formAlert(form)).toHaveText('Revise 4 campos: Rede, Endereço da carteira, Tipo de carteira e Código de indicação.')
  await expect(form.getByRole('combobox', { name: 'Rede' })).toBeFocused()

  await chooseOption(form, 'Rede', 'Ethereum')
  await field(form, 'Endereço da carteira').fill('0xZZ21d5F07aB94e3D6c1E2f9A40b7D58c3E1aF62b')
  await chooseOption(form, 'Tipo de carteira', 'MetaMask')
  await field(form, 'Código de indicação').fill('bruno27')
  await expect(field(form, 'Código de indicação')).toHaveValue('BRUNO27')
  await submit.click()
  await expect(field(form, 'Endereço da carteira')).toBeFocused()

  await field(form, 'Endereço da carteira').fill('0x9C21d5F07aB94e3D6c1E2f9A40b7D58c3E1aF62c')
  await submit.click()
  await expect(form).toHaveCount(0)
  const secondary = page.locator('[data-slot="wallet-summary"]').nth(1)
  await expect(secondary).toContainText('0x9C21d5F07aB94e3D6c1E2f9A40b7D58c3E1aF62c')

  await page.reload()
  await expect(page.locator('[data-slot="wallet-summary"]').nth(1)).toContainText('0x9C21d5F07aB94e3D6c1E2f9A40b7D58c3E1aF62c')

  await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).click()
  await expect(page.getByRole('checkbox', { name: 'Igual à carteira principal' })).toBeChecked()
  await expect(page.getByText('Usa os mesmos dados da carteira principal e acompanha suas alterações.')).toBeVisible()
  await expect(page.locator('[data-slot="wallet-summary"]').nth(1)).toContainText('0x51bE7D20c9A3f84E6d2B0a7C19F5e83D4c6A2b97')

  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Igual à carteira principal' })).toBeChecked()
})

test('registers the primary wallet of a new account', async ({ page }) => {
  await openApp(page, '/register?redirect=%2Fwallets')
  await field(page, 'Nome de usuário').fill('dora.mint')
  await field(page, 'E-mail').fill('dora@kurio.test')
  await field(page, 'Senha').fill('Colecao2026')
  await field(page, 'Confirmar senha').fill('Colecao2026')
  await page.getByRole('button', { name: /^Criar (perfil|conta)$/ }).click()
  await expect(page).toHaveURL(/\/wallets$/)

  const form = page.getByRole('form', { name: 'Carteira principal' })
  await field(form, 'Apelido da carteira').fill('Cofre da Dora')
  await chooseOption(form, 'Rede', 'Polygon')
  await field(form, 'Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
  await chooseOption(form, 'Tipo de carteira', 'Coinbase Wallet')
  await field(form, 'Código de indicação').fill('DORA26')
  await field(form, 'Nome ENS').fill('dora')
  await form.getByRole('button', { name: 'Salvar carteira' }).click()

  await expect(form).toHaveCount(0)
  await page.reload()
  const summary = page.locator('[data-slot="wallet-summary"]').first()
  await expect(summary).toContainText('Cofre da Dora')
  await expect(summary).toContainText('Polygon')
})
