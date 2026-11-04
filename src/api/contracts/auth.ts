import type { IsoDateTime } from './common'

export const USERNAME_PATTERN = /^[a-z0-9_.]{3,24}$/
export const PASSWORD_MIN_LENGTH = 8

export interface SessionUser {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface Session {
  user: SessionUser
  createdAt: IsoDateTime
  expiresAt: IsoDateTime
}

export interface AuthResponse {
  token: string
  session: Session
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  passwordConfirmation: string
}

export interface LoginRequest {
  email: string
  password: string
}
