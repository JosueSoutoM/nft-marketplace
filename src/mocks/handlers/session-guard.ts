import type { Session } from '@/api/contracts'
import type { SessionRecord, UserRecord } from '../db'
import { findSession } from '../db/sessions'
import { errorResponse } from '../responses'

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  const match = header?.match(/^Bearer\s+(\S+)$/i)
  return match ? match[1] : null
}

export async function authenticate(request: Request): Promise<{ user: UserRecord; session: SessionRecord }> {
  const token = readBearerToken(request)
  if (!token) {
    throw errorResponse(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  }
  const lookup = await findSession(token)
  if (lookup.status === 'expired') {
    throw errorResponse(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  if (lookup.status === 'missing') {
    throw errorResponse(401, 'UNAUTHENTICATED', 'Sessão inválida. Entre novamente.')
  }
  return { user: lookup.user, session: lookup.session }
}

export function toSession(user: UserRecord, session: SessionRecord): Session {
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  }
}
