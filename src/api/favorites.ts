import type { Favorite, FavoriteListResponse } from './contracts'
import { http, type RequestOptions } from './http'

export async function listFavorites({ signal }: RequestOptions = {}): Promise<FavoriteListResponse> {
  const { data } = await http.get<FavoriteListResponse>('/favorites', { signal })
  return data
}

export async function addFavorite(nftId: string, { signal }: RequestOptions = {}): Promise<Favorite> {
  const { data } = await http.put<Favorite>(`/favorites/${encodeURIComponent(nftId)}`, null, { signal })
  return data
}

export async function removeFavorite(nftId: string, { signal }: RequestOptions = {}): Promise<void> {
  await http.delete(`/favorites/${encodeURIComponent(nftId)}`, { signal })
}
