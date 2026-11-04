import type { NetworkListResponse } from '@/api/contracts'
import { getDb } from '../db'
import { jsonResponse } from '../responses'
import { apiRoute } from './route'

const list = apiRoute('networks.list', () => {
  const body: NetworkListResponse = { items: getDb().networks }
  return jsonResponse(body)
})

export const networkHandlers = [list]
