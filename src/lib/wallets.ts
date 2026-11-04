import type { WalletSlot, WalletType } from '@/api/contracts'

export const walletTypeLabels: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const walletSlotLabels: Record<WalletSlot, string> = {
  primary: 'Principal',
  secondary: 'Reserva',
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
