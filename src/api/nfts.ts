import type { Nft, NftListQuery, NftListResponse } from './contracts'
import { http, type RequestOptions } from './http'

export async function listNfts(query: NftListQuery = {}, { signal }: RequestOptions = {}): Promise<NftListResponse> {
  const { data } = await http.get<NftListResponse>('/nfts', { params: query, signal })
  return data
}

export async function getNft(nftId: string, { signal }: RequestOptions = {}): Promise<Nft> {
  const { data } = await http.get<Nft>(`/nfts/${encodeURIComponent(nftId)}`, { signal })
  return data
}
