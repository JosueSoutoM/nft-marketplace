import {
  AVATAR_FORM_FIELD,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  type Profile,
} from '@/api/contracts'
import { commit, getDb, type UserRecord } from '../db'
import { generateSalt, hashPassword, verifyPassword } from '../db/crypto'
import { errorResponse, jsonResponse, noContentResponse } from '../responses'
import { isScenario } from '../scenarios'
import { apiRoute, readJsonBody, stringField } from './route'
import { authenticate } from './session-guard'
import {
  collectErrors,
  normalizeEmail,
  trimmedString,
  validateEmail,
  validateEnsName,
  validateNewPassword,
  validateText,
  validateUsername,
} from './validation'

const IMAGE_SIGNATURES: Record<(typeof AVATAR_MIME_TYPES)[number], (bytes: Uint8Array) => boolean> = {
  'image/png': (bytes) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte),
  'image/jpeg': (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/webp': (bytes) =>
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
}

function toProfile(user: UserRecord): Profile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function isAvatarType(type: string): type is (typeof AVATAR_MIME_TYPES)[number] {
  return (AVATAR_MIME_TYPES as readonly string[]).includes(type)
}

function touchUser(user: UserRecord): void {
  user.updatedAt = new Date().toISOString()
  commit()
}

const get = apiRoute('profile.get', async ({ request }) => {
  const { user } = await authenticate(request)
  return jsonResponse(toProfile(user))
})

const update = apiRoute('profile.update', async ({ request }) => {
  const { user } = await authenticate(request)
  const body = await readJsonBody(request)
  const displayName = trimmedString(body.displayName)
  const username = trimmedString(body.username)
  const email = normalizeEmail(trimmedString(body.email))
  const ensName = trimmedString(body.ensName)
  const walletNickname = trimmedString(body.walletNickname)

  const fieldErrors = collectErrors({
    displayName: validateText(displayName, 'o nome de exibição', 2, 50),
    username: validateUsername(username),
    email: validateEmail(email),
    ensName: validateEnsName(ensName),
    walletNickname: validateText(walletNickname, 'o apelido da carteira', 2, 40),
  })
  if (fieldErrors) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
  }
  if (isScenario('form-validation')) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
      username: 'Este nome de usuário é reservado pela plataforma.',
    })
  }
  const others = getDb().users.filter((record) => record.id !== user.id)
  if (others.some((record) => record.email === email)) {
    return errorResponse(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', { email: 'Este e-mail já está cadastrado.' })
  }
  if (others.some((record) => record.username === username)) {
    return errorResponse(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', {
      username: 'Este nome de usuário já está em uso.',
    })
  }

  Object.assign(user, { displayName, username, email, ensName, walletNickname })
  touchUser(user)
  return jsonResponse(toProfile(user))
})

const updateAvatar = apiRoute('profile.updateAvatar', async ({ request }) => {
  const { user } = await authenticate(request)
  if (!request.headers.get('Content-Type')?.includes('multipart/form-data')) {
    return errorResponse(400, 'BAD_REQUEST', 'Envie a imagem como multipart/form-data.')
  }
  const form = await request.formData()
  const file = form.get(AVATAR_FORM_FIELD)
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma imagem.', { avatar: 'Selecione uma imagem.' })
  }
  if (!isAvatarType(file.type)) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Formato não suportado.', { avatar: 'Use uma imagem PNG, JPEG ou WebP.' })
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'A imagem é grande demais.', {
      avatar: `A imagem deve ter até ${AVATAR_MAX_BYTES / 1024} KB.`,
    })
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!IMAGE_SIGNATURES[file.type](bytes)) {
    return errorResponse(422, 'VALIDATION_ERROR', 'O arquivo não é uma imagem válida.', {
      avatar: 'O conteúdo do arquivo não corresponde a uma imagem válida.',
    })
  }
  user.avatarUrl = `data:${file.type};base64,${toBase64(bytes)}`
  touchUser(user)
  return jsonResponse(toProfile(user))
})

const removeAvatar = apiRoute('profile.removeAvatar', async ({ request }) => {
  const { user } = await authenticate(request)
  user.avatarUrl = null
  touchUser(user)
  return jsonResponse(toProfile(user))
})

const changePassword = apiRoute('profile.changePassword', async ({ request }) => {
  const { user, session } = await authenticate(request)
  const body = await readJsonBody(request)
  const currentPassword = stringField(body, 'currentPassword')
  const newPassword = stringField(body, 'newPassword')
  const newPasswordConfirmation = stringField(body, 'newPasswordConfirmation')

  const fieldErrors = collectErrors({
    currentPassword: currentPassword ? null : 'Informe a senha atual.',
    newPassword: validateNewPassword(newPassword) ?? (newPassword === currentPassword ? 'A nova senha deve ser diferente da atual.' : null),
    newPasswordConfirmation: !newPasswordConfirmation
      ? 'Confirme a nova senha.'
      : newPasswordConfirmation !== newPassword
        ? 'As senhas não conferem.'
        : null,
  })
  if (fieldErrors) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
  }
  if (!(await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash))) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' })
  }
  if (isScenario('form-validation')) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', {
      newPassword: 'Esta senha aparece em listas de senhas vazadas. Escolha outra.',
    })
  }

  const passwordSalt = generateSalt()
  const passwordHash = await hashPassword(newPassword, passwordSalt)
  Object.assign(user, { passwordSalt, passwordHash })
  const db = getDb()
  db.sessions = db.sessions.filter((record) => record.userId !== user.id || record.tokenHash === session.tokenHash)
  touchUser(user)
  return noContentResponse()
})

export const profileHandlers = [get, update, updateAvatar, removeAvatar, changePassword]
