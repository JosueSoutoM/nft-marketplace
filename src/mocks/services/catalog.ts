import type { EthAmount, Nft, NftEdition } from '@/api/contracts'
import { compareEth, isEthAmount, normalizeEth } from '@/lib/eth'
import { publishNftUpdated } from '../changes'
import { commit, getDb } from '../db'

export interface EditionChange {
  editionId?: string
  price?: EthAmount
  available?: number
}

export function findNft(nftId: string): Nft | null {
  return getDb().nfts.find((nft) => nft.id === nftId) ?? null
}

export function findEdition(nft: Nft, editionId: string): NftEdition | null {
  return nft.editions.find((edition) => edition.id === editionId) ?? null
}

export function maxQuantityFor(edition: NftEdition): number {
  return Math.max(0, Math.min(edition.available, edition.maxPerOrder))
}

function applyEditionChange(nft: Nft, change: EditionChange): boolean {
  const edition = findEdition(nft, change.editionId ?? nft.defaultEditionId)
  if (!edition) {
    throw new Error(`Unknown edition ${change.editionId} for ${nft.id}`)
  }
  let changed = false
  if (change.price !== undefined) {
    if (!isEthAmount(change.price) || compareEth(change.price, '0') < 0) {
      throw new Error(`Invalid price: ${change.price}`)
    }
    if (compareEth(change.price, edition.price) !== 0) {
      edition.price = normalizeEth(change.price)
      changed = true
    }
  }
  if (change.available !== undefined) {
    if (!Number.isInteger(change.available) || change.available < 0) {
      throw new Error(`Invalid availability: ${change.available}`)
    }
    if (change.available !== edition.available) {
      edition.available = change.available
      changed = true
    }
  }
  return changed
}

export function updateNftEditions(nftId: string, changes: EditionChange[]): Nft {
  const nft = findNft(nftId)
  if (!nft) {
    throw new Error(`Unknown NFT: ${nftId}`)
  }
  const changed = changes.map((change) => applyEditionChange(nft, change)).some(Boolean)
  if (!changed) {
    return nft
  }
  const defaultEdition = findEdition(nft, nft.defaultEditionId) ?? nft.editions[0]
  nft.price = defaultEdition.price
  nft.compareAtPrice = defaultEdition.compareAtPrice
  nft.version += 1
  commit()
  publishNftUpdated(nft)
  return nft
}
