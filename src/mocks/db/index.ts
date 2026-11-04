import { createSeed } from './seed'
import { DB_SCHEMA_VERSION, DB_STORAGE_KEY, type MockDatabase } from './schema'

let state: MockDatabase | null = null

function load(): MockDatabase | null {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<MockDatabase>
    return parsed.schemaVersion === DB_SCHEMA_VERSION ? (parsed as MockDatabase) : null
  } catch {
    return null
  }
}

function save(): void {
  if (!state) {
    return
  }
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('[mocks] Falha ao persistir o banco simulado.', error)
  }
}

export async function initDatabase(): Promise<void> {
  state = load() ?? (await createSeed())
  save()
}

export async function resetDatabase(): Promise<void> {
  state = await createSeed()
  save()
}

export function getDb(): MockDatabase {
  if (!state) {
    throw new Error('Mock database not initialized')
  }
  return state
}

export function commit(): void {
  save()
}

export function nextId(prefix: string): string {
  const db = getDb()
  const value = (db.sequences[prefix] ?? 0) + 1
  db.sequences[prefix] = value
  return `${prefix}-${String(value).padStart(4, '0')}`
}

export type * from './schema'
