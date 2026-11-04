import { PASSWORD_MIN_LENGTH, USERNAME_PATTERN, type FieldErrors } from '@/api/contracts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Informe o e-mail.'
  }
  return EMAIL_PATTERN.test(email) ? null : 'Informe um e-mail válido.'
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Informe o nome de usuário.'
  }
  return USERNAME_PATTERN.test(username)
    ? null
    : 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto ou sublinhado.'
}

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return 'Informe a senha.'
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  return /[A-Za-z]/.test(password) && /\d/.test(password) ? null : 'A senha deve conter letras e números.'
}

export function collectErrors(entries: Record<string, string | null>): FieldErrors | null {
  const errors = Object.fromEntries(Object.entries(entries).filter((entry): entry is [string, string] => entry[1] !== null))
  return Object.keys(errors).length > 0 ? errors : null
}
