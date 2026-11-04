import type { Favorite, FavoriteListResponse } from '@/api/contracts'
import { commit, getDb, type FavoriteRecord } from '../db'
import { errorResponse, jsonResponse, noContentResponse } from '../responses'
import { findNft } from '../services/catalog'
import { toNftSummary } from './mappers'
import { apiRoute } from './route'
import { authenticate } from './session-guard'

function toFavorite(record: FavoriteRecord): Favorite | null {
  const nft = findNft(record.nftId)
  return nft ? { nftId: record.nftId, createdAt: record.createdAt, nft: toNftSummary(nft) } : null
}

const list = apiRoute('favorites.list', async ({ request }) => {
  const { user } = await authenticate(request)
  const items = getDb()
    .favorites.filter((record) => record.userId === user.id)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .flatMap((record) => toFavorite(record) ?? [])
  const body: FavoriteListResponse = { items }
  return jsonResponse(body)
})

const add = apiRoute('favorites.add', async ({ request, params }) => {
  const { user } = await authenticate(request)
  if (!findNft(params.nftId)) {
    return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
  }
  const db = getDb()
  let record = db.favorites.find((entry) => entry.userId === user.id && entry.nftId === params.nftId)
  if (!record) {
    record = { userId: user.id, nftId: params.nftId, createdAt: new Date().toISOString() }
    db.favorites.push(record)
    commit()
  }
  return jsonResponse(toFavorite(record) as Favorite)
})

const remove = apiRoute('favorites.remove', async ({ request, params }) => {
  const { user } = await authenticate(request)
  const db = getDb()
  db.favorites = db.favorites.filter((entry) => !(entry.userId === user.id && entry.nftId === params.nftId))
  commit()
  return noContentResponse()
})

export const favoriteHandlers = [list, add, remove]
