import {
  NETWORK_IDS,
  NFT_CATEGORY_IDS,
  NFT_SEARCH_MAX_LENGTH,
  NFT_SEGMENTS,
  NFT_SORTS,
  type EthAmount,
  type NetworkId,
  type NftCategoryId,
  type NftListQuery,
  type NftSegment,
  type NftSort,
} from '@/api/contracts'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { compareEth, parseEthInput } from '@/lib/eth'
import { splitList } from '@/lib/search-serialization'

export interface CatalogSearch {
  q: string
  category: NftCategoryId[]
  network: NetworkId[]
  priceMin?: EthAmount
  priceMax?: EthAmount
  segment: NftSegment
  sort: NftSort
  page: number
  favorites: boolean
}

export type CatalogSearchInput = Partial<CatalogSearch>

export const CATALOG_SEARCH_DEFAULTS = {
  q: '',
  category: [],
  network: [],
  segment: 'all',
  sort: 'recent',
  page: 1,
  favorites: false,
} satisfies CatalogSearch

const MAX_PAGE = 10_000

function pickOne<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function pickMany<T extends string>(allowed: readonly T[], value: unknown): T[] {
  const values = splitList(value)
  return allowed.filter((option) => values.includes(option))
}

function parseQueryText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return ''
  }
  return String(value).trim().slice(0, NFT_SEARCH_MAX_LENGTH)
}

function parsePrice(value: unknown): EthAmount | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined
  }
  return parseEthInput(String(value)) ?? undefined
}

function parseFlag(value: unknown): boolean {
  return value === true || value === 'true'
}

function parsePage(value: unknown): number {
  const page = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isSafeInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1
}

export function validateCatalogSearch(input: CatalogSearchInput & SearchSchemaInput): CatalogSearch {
  const raw = input as Record<string, unknown>
  let priceMin = parsePrice(raw.priceMin)
  let priceMax = parsePrice(raw.priceMax)
  if (priceMin !== undefined && priceMax !== undefined && compareEth(priceMin, priceMax) > 0) {
    priceMin = undefined
    priceMax = undefined
  }
  return {
    q: parseQueryText(raw.q),
    category: pickMany(NFT_CATEGORY_IDS, raw.category),
    network: pickMany(NETWORK_IDS, raw.network),
    priceMin,
    priceMax,
    segment: pickOne(NFT_SEGMENTS, raw.segment, CATALOG_SEARCH_DEFAULTS.segment),
    sort: pickOne(NFT_SORTS, raw.sort, CATALOG_SEARCH_DEFAULTS.sort),
    page: parsePage(raw.page),
    favorites: parseFlag(raw.favorites),
  }
}

export function toNftListQuery(search: CatalogSearch): NftListQuery {
  return {
    ...(search.q && { q: search.q }),
    ...(search.category.length > 0 && { category: search.category }),
    ...(search.network.length > 0 && { network: search.network }),
    ...(search.priceMin !== undefined && { minPrice: search.priceMin }),
    ...(search.priceMax !== undefined && { maxPrice: search.priceMax }),
    segment: search.segment,
    sort: search.sort,
    page: search.page,
  }
}

export function hasActiveFilters(search: CatalogSearch): boolean {
  return (
    search.q !== '' ||
    search.category.length > 0 ||
    search.network.length > 0 ||
    search.priceMin !== undefined ||
    search.priceMax !== undefined ||
    search.segment !== 'all'
  )
}

export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
