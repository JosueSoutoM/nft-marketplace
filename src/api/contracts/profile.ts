import type { IsoDateTime } from './common'

export const AVATAR_FORM_FIELD = 'avatar'
export const AVATAR_MAX_BYTES = 512 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export interface Profile {
  id: string
  email: string
  displayName: string
  username: string
  ensName: string | null
  walletNickname: string | null
  avatarUrl: string | null
  updatedAt: IsoDateTime
}

export interface UpdateProfileRequest {
  displayName: string
  username: string
  email: string
  ensName: string | null
  walletNickname: string | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  newPasswordConfirmation: string
}
