import type { Network, NetworkId } from '@/api/contracts'

export const networkFixtures: Network[] = [
  {
    id: 'ethereum',
    label: 'Ethereum',
    fee: '0.016',
    feeEstimated: true,
    explorerBaseUrl: 'https://etherscan.io/tx/',
  },
  {
    id: 'polygon',
    label: 'Polygon',
    fee: '0.002',
    feeEstimated: true,
    explorerBaseUrl: 'https://polygonscan.com/tx/',
  },
  {
    id: 'solana',
    label: 'Solana',
    fee: '0.0008',
    feeEstimated: true,
    explorerBaseUrl: 'https://solscan.io/tx/',
  },
]

export function networkLabel(id: NetworkId): string {
  return networkFixtures.find((network) => network.id === id)?.label ?? id
}
