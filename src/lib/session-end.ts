import type { SessionEndReason } from '@/api/session-token'

export type SessionNotice = Exclude<SessionEndReason, 'logout'>

export const SESSION_NOTICES: Record<SessionNotice, { title: string; description: string }> = {
  expired: {
    title: 'Sua sessão expirou.',
    description: 'Entre novamente para continuar de onde parou.',
  },
  invalid: {
    title: 'Sua sessão foi encerrada.',
    description: 'Entre novamente para continuar.',
  },
}

export function toSessionNotice(reason: SessionEndReason | null | undefined): SessionNotice | undefined {
  return reason === 'expired' || reason === 'invalid' ? reason : undefined
}

export function parseSessionNotice(value: unknown): SessionNotice | undefined {
  return value === 'expired' || value === 'invalid' ? value : undefined
}
