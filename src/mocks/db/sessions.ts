import { generateToken, hashToken } from './crypto'
import { commit, getDb } from './index'
import type { SessionRecord, UserRecord } from './schema'

const EXPIRED_RETENTION_MS = 86_400_000

export type SessionLookup =
  | { status: 'valid'; session: SessionRecord; user: UserRecord }
  | { status: 'expired' }
  | { status: 'missing' }

export async function createSession(userId: string, ttlSeconds: number): Promise<{ token: string; session: SessionRecord }> {
  const db = getDb()
  const now = Date.now()
  const token = generateToken()
  const session: SessionRecord = {
    tokenHash: await hashToken(token),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
  }
  db.sessions = db.sessions.filter((record) => Date.parse(record.expiresAt) + EXPIRED_RETENTION_MS > now)
  db.sessions.push(session)
  commit()
  return { token, session }
}

export async function findSession(token: string): Promise<SessionLookup> {
  const db = getDb()
  const tokenHash = await hashToken(token)
  const session = db.sessions.find((record) => record.tokenHash === tokenHash)
  const user = session && db.users.find((record) => record.id === session.userId)
  if (!session || !user) {
    return { status: 'missing' }
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return { status: 'expired' }
  }
  return { status: 'valid', session, user }
}

export function findActiveUserIdByTokenHash(tokenHash: string): string | null {
  const session = getDb().sessions.find((record) => record.tokenHash === tokenHash)
  return session && Date.parse(session.expiresAt) > Date.now() ? session.userId : null
}

export async function deleteSession(token: string): Promise<void> {
  const db = getDb()
  const tokenHash = await hashToken(token)
  db.sessions = db.sessions.filter((record) => record.tokenHash !== tokenHash)
  commit()
}

export function expireAllSessions(): void {
  const db = getDb()
  const now = new Date().toISOString()
  db.sessions = db.sessions.map((session) => (Date.parse(session.expiresAt) > Date.now() ? { ...session, expiresAt: now } : session))
  commit()
}
