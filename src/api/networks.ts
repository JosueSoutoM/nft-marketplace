import type { NetworkListResponse } from './contracts'
import { http, type RequestOptions } from './http'

export async function listNetworks({ signal }: RequestOptions = {}): Promise<NetworkListResponse> {
  const { data } = await http.get<NetworkListResponse>('/networks', { signal })
  return data
}
