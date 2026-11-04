import type { Nft, NftEdition } from '@/api/contracts'
import type { SearchSchemaInput } from '@tanstack/react-router'

export interface NftDetailSearch {
  edition?: string
}

const EDITION_ID_PATTERN = /^[a-z0-9-]{1,40}$/

export function validateNftDetailSearch(input: NftDetailSearch & SearchSchemaInput): NftDetailSearch {
  const raw: unknown = input.edition
  return { edition: typeof raw === 'string' && EDITION_ID_PATTERN.test(raw) ? raw : undefined }
}

export function isSoldOut(edition: NftEdition): boolean {
  return edition.available === 0
}

export function resolveEdition(nft: Nft, requestedId: string | undefined): NftEdition {
  const requested = nft.editions.find((edition) => edition.id === requestedId)
  if (requested) {
    return requested
  }
  const fallback = nft.editions.find((edition) => edition.id === nft.defaultEditionId) ?? nft.editions[0]
  return isSoldOut(fallback) ? (nft.editions.find((edition) => !isSoldOut(edition)) ?? fallback) : fallback
}

export function maxQuantity(edition: NftEdition): number {
  return Math.max(0, Math.min(edition.available, edition.maxPerOrder))
}

export function clampQuantity(quantity: number, max: number): number {
  return Math.min(Math.max(1, Math.trunc(quantity)), Math.max(1, max))
}

export function limitReason(edition: NftEdition): string {
  if (isSoldOut(edition)) {
    return `A edição ${edition.label} está esgotada.`
  }
  if (edition.available <= edition.maxPerOrder) {
    return edition.available === 1
      ? `Só resta 1 unidade da edição ${edition.label}.`
      : `Só restam ${edition.available} unidades da edição ${edition.label}.`
  }
  return `Limite de ${edition.maxPerOrder} unidades por pedido na edição ${edition.label}.`
}

export function formatRating(average: number): string {
  return average.toFixed(1)
}
