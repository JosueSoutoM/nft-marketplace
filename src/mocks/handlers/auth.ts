import type { AuthResponse } from '@/api/contracts'
import { commit, getDb, nextId, type UserRecord } from '../db'
import { generateSalt, hashPassword, verifyPassword } from '../db/crypto'
import { createSession, deleteSession, findSession } from '../db/sessions'
import { errorResponse, jsonResponse, noContentResponse } from '../responses'
import { getSettings, isScenario } from '../scenarios'
import { apiRoute, readJsonBody, stringField } from './route'
import { authenticate, readBearerToken, toSession } from './session-guard'
import { clearWalletConnections } from './wallets'
import { collectErrors, normalizeEmail, validateEmail, validateNewPassword, validateUsername } from './validation'

async function authResponse(user: UserRecord, status: number): Promise<Response> {
  const { token, session } = await createSession(user.id, getSettings().sessionTtlSeconds)
  const body: AuthResponse = { token, session: toSession(user, session) }
  return jsonResponse(body, status)
}

const register = apiRoute('auth.register', async ({ request }) => {
  const body = await readJsonBody(request)
  const username = stringField(body, 'username').trim()
  const email = normalizeEmail(stringField(body, 'email'))
  const password = stringField(body, 'password')
  const passwordConfirmation = stringField(body, 'passwordConfirmation')

  const fieldErrors = collectErrors({
    username: validateUsername(username),
    email: validateEmail(email),
    password: validateNewPassword(password),
    passwordConfirmation: !passwordConfirmation
      ? 'Confirme a senha.'
      : passwordConfirmation !== password
        ? 'As senhas não conferem.'
        : null,
  })
  if (fieldErrors) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
  }
  if (isScenario('form-validation')) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
      username: 'Este nome de usuário é reservado pela plataforma.',
    })
  }

  const db = getDb()
  if (isScenario('register-conflict') || db.users.some((user) => user.email === email)) {
    return errorResponse(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
      email: 'Este e-mail já está cadastrado.',
    })
  }
  if (db.users.some((user) => user.username === username)) {
    return errorResponse(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
      username: 'Este nome de usuário já está em uso.',
    })
  }

  const now = new Date().toISOString()
  const passwordSalt = generateSalt()
  const user: UserRecord = {
    id: nextId('user'),
    email,
    passwordHash: await hashPassword(password, passwordSalt),
    passwordSalt,
    displayName: username,
    username,
    ensName: null,
    walletNickname: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  }
  db.users.push(user)
  commit()
  return authResponse(user, 201)
})

const login = apiRoute('auth.login', async ({ request }) => {
  const body = await readJsonBody(request)
  const email = normalizeEmail(stringField(body, 'email'))
  const password = stringField(body, 'password')

  const fieldErrors = collectErrors({
    email: validateEmail(email),
    password: password ? null : 'Informe a senha.',
  })
  if (fieldErrors) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
  }

  const user = getDb().users.find((record) => record.email === email)
  const valid = user ? await verifyPassword(password, user.passwordSalt, user.passwordHash) : false
  if (!user || !valid) {
    return errorResponse(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
  }
  return authResponse(user, 200)
})

const session = apiRoute('auth.session', async ({ request }) => {
  const { user, session: record } = await authenticate(request)
  return jsonResponse(toSession(user, record))
})

const logout = apiRoute('auth.logout', async ({ request }) => {
  const token = readBearerToken(request)
  if (token) {
    const lookup = await findSession(token)
    if (lookup.status === 'valid') {
      clearWalletConnections(lookup.user.id)
    }
    await deleteSession(token)
  }
  return noContentResponse()
})

export const authHandlers = [register, login, session, logout]
