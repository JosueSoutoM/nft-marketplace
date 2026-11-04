import type { WalletType } from '@/api/contracts'

export const walletTypeLabels: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}
