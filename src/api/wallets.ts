import type {
  ConnectWalletRequest,
  UpsertWalletRequest,
  Wallet,
  WalletConnection,
  WalletListResponse,
  WalletSlot,
} from './contracts'
import { http, type RequestOptions } from './http'

export async function listWallets({ signal }: RequestOptions = {}): Promise<WalletListResponse> {
  const { data } = await http.get<WalletListResponse>('/wallets', { signal })
  return data
}

export async function saveWallet(slot: WalletSlot, body: UpsertWalletRequest, { signal }: RequestOptions = {}): Promise<Wallet> {
  const { data } = await http.put<Wallet>(`/wallets/${slot}`, body, { signal })
  return data
}

export async function connectWallet(
  walletId: string,
  body: ConnectWalletRequest,
  { signal }: RequestOptions = {},
): Promise<WalletConnection> {
  const { data } = await http.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/connect`, body, { signal })
  return data
}

export async function disconnectWallet(walletId: string, { signal }: RequestOptions = {}): Promise<WalletConnection> {
  const { data } = await http.post<WalletConnection>(`/wallets/${encodeURIComponent(walletId)}/disconnect`, null, { signal })
  return data
}
