import type { Network, NetworkId } from '@/api/contracts'

export const networkFixtures: Network[] = [
  {
    id: 'ethereum',
    label: 'Ethereum',
    fee: '0.016',
    feeEstimated: true,
    explorerBaseUrl: 'https://explorer.kurio.test/ethereum/tx/',
  },
  {
    id: 'polygon',
    label: 'Polygon',
    fee: '0.002',
    feeEstimated: true,
    explorerBaseUrl: 'https://explorer.kurio.test/polygon/tx/',
  },
  {
    id: 'solana',
    label: 'Solana',
    fee: '0.0008',
    feeEstimated: true,
    explorerBaseUrl: 'https://explorer.kurio.test/solana/tx/',
  },
]

export function networkLabel(id: NetworkId): string {
  return networkFixtures.find((network) => network.id === id)?.label ?? id
}
