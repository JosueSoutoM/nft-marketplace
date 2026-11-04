import {
  NETWORK_IDS,
  NFT_CATEGORY_IDS,
  NFT_DEFAULT_PAGE_SIZE,
  NFT_MAX_PAGE_SIZE,
  NFT_SEARCH_MAX_LENGTH,
  NFT_SEGMENTS,
  NFT_SORTS,
  type FieldErrors,
  type NetworkId,
  type Nft,
  type NftCategoryId,
  type NftFacets,
  type NftListResponse,
  type NftSegment,
  type NftSort,
} from '@/api/contracts'
import { compareEth, isEthAmount, maxEth, minEth, normalizeEth } from '@/lib/eth'
import { getDb } from '../db'
import { categoryLabels } from '../fixtures/categories'
import { networkLabel } from '../fixtures/networks'
import { errorResponse, jsonResponse } from '../responses'
import { isScenario } from '../scenarios'
import { toNftSummary } from './mappers'
import { apiRoute } from './route'
import { authenticate } from './session-guard'

interface ParsedQuery {
  q: string
  categories: NftCategoryId[]
  networks: NetworkId[]
  collection: string | null
  minPrice: string | null
  maxPrice: string | null
  segment: NftSegment
  featured: boolean | null
  favorites: boolean
  sort: NftSort
  page: number
  pageSize: number
}

type FacetKey = 'category' | 'network'

function includes<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value)
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function parsePositiveInteger(raw: string | null, fallback: number): number | null {
  if (raw === null || raw === '') {
    return fallback
  }
  return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : null
}

function parseQuery(url: URL): { query: ParsedQuery } | { errors: FieldErrors } {
  const params = url.searchParams
  const errors: FieldErrors = {}

  const q = params.get('q') ?? ''
  if (q.length > NFT_SEARCH_MAX_LENGTH) {
    errors.q = `A busca aceita até ${NFT_SEARCH_MAX_LENGTH} caracteres.`
  }

  const categories = params.getAll('category')
  if (!categories.every((value) => includes(NFT_CATEGORY_IDS, value))) {
    errors.category = 'Categoria desconhecida.'
  }

  const networks = params.getAll('network')
  if (!networks.every((value) => includes(NETWORK_IDS, value))) {
    errors.network = 'Rede desconhecida.'
  }

  const minPrice = params.get('minPrice')
  const maxPrice = params.get('maxPrice')
  const validMin = minPrice === null || (isEthAmount(minPrice) && !minPrice.startsWith('-'))
  const validMax = maxPrice === null || (isEthAmount(maxPrice) && !maxPrice.startsWith('-'))
  if (!validMin) {
    errors.minPrice = 'Preço mínimo inválido.'
  }
  if (!validMax) {
    errors.maxPrice = 'Preço máximo inválido.'
  }
  if (validMin && validMax && minPrice !== null && maxPrice !== null && compareEth(minPrice, maxPrice) > 0) {
    errors.maxPrice = 'O preço máximo deve ser maior ou igual ao mínimo.'
  }

  const segment = params.get('segment') ?? 'all'
  if (!includes(NFT_SEGMENTS, segment)) {
    errors.segment = 'Segmento desconhecido.'
  }

  const featured = params.get('featured')
  if (featured !== null && featured !== 'true' && featured !== 'false') {
    errors.featured = 'Use true ou false.'
  }

  const favorites = params.get('favorites')
  if (favorites !== null && favorites !== 'true' && favorites !== 'false') {
    errors.favorites = 'Use true ou false.'
  }

  const sort = params.get('sort') ?? 'recent'
  if (!includes(NFT_SORTS, sort)) {
    errors.sort = 'Ordenação desconhecida.'
  }

  const page = parsePositiveInteger(params.get('page'), 1)
  if (page === null) {
    errors.page = 'A página deve ser um inteiro maior ou igual a 1.'
  }

  const pageSize = parsePositiveInteger(params.get('pageSize'), NFT_DEFAULT_PAGE_SIZE)
  if (pageSize === null || pageSize > NFT_MAX_PAGE_SIZE) {
    errors.pageSize = `O tamanho da página deve estar entre 1 e ${NFT_MAX_PAGE_SIZE}.`
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return {
    query: {
      q: normalizeText(q),
      categories: categories as NftCategoryId[],
      networks: networks as NetworkId[],
      collection: params.get('collection'),
      minPrice: minPrice === null ? null : normalizeEth(minPrice),
      maxPrice: maxPrice === null ? null : normalizeEth(maxPrice),
      segment: segment as NftSegment,
      featured: featured === null ? null : featured === 'true',
      favorites: favorites === 'true',
      sort: sort as NftSort,
      page: page as number,
      pageSize: pageSize as number,
    },
  }
}

function matches(nft: Nft, query: ParsedQuery, ignore?: FacetKey): boolean {
  if (query.q) {
    const haystack = normalizeText(`${nft.name} ${nft.creator.name} ${nft.collection.name}`)
    if (!haystack.includes(query.q)) {
      return false
    }
  }
  if (ignore !== 'category' && query.categories.length > 0 && !query.categories.includes(nft.category)) {
    return false
  }
  if (ignore !== 'network' && query.networks.length > 0 && !query.networks.includes(nft.network)) {
    return false
  }
  if (query.collection && nft.collection.id !== query.collection) {
    return false
  }
  if (query.minPrice !== null && compareEth(nft.price, query.minPrice) < 0) {
    return false
  }
  if (query.maxPrice !== null && compareEth(nft.price, query.maxPrice) > 0) {
    return false
  }
  if (query.segment === 'new' && !nft.isNewRelease) {
    return false
  }
  if (query.segment === 'trending' && !nft.isTrending) {
    return false
  }
  return query.featured === null || nft.isFeatured === query.featured
}

function compareNfts(sort: NftSort): (left: Nft, right: Nft) => number {
  const byPrimary: Record<NftSort, (left: Nft, right: Nft) => number> = {
    recent: (left, right) => Date.parse(right.listedAt) - Date.parse(left.listedAt),
    'price-asc': (left, right) => compareEth(left.price, right.price),
    'price-desc': (left, right) => compareEth(right.price, left.price),
    'name-asc': (left, right) => left.name.localeCompare(right.name, 'pt-BR'),
    'rating-desc': (left, right) => right.rating.average - left.rating.average || right.rating.count - left.rating.count,
  }
  return (left, right) => byPrimary[sort](left, right) || left.id.localeCompare(right.id)
}

function buildFacets(catalog: Nft[], query: ParsedQuery): NftFacets {
  const prices = catalog.map((nft) => nft.price)
  return {
    categories: NFT_CATEGORY_IDS.map((id) => ({
      id,
      label: categoryLabels[id],
      count: catalog.filter((nft) => nft.category === id && matches(nft, query, 'category')).length,
    })),
    networks: NETWORK_IDS.map((id) => ({
      id,
      label: networkLabel(id),
      count: catalog.filter((nft) => nft.network === id && matches(nft, query, 'network')).length,
    })),
    priceRange: {
      min: prices.length > 0 ? prices.reduce(minEth) : '0',
      max: prices.length > 0 ? prices.reduce(maxEth) : '0',
    },
  }
}

function catalog(): Nft[] {
  return isScenario('empty-catalog') ? [] : getDb().nfts
}

async function listSource(request: Request, query: ParsedQuery): Promise<Nft[]> {
  if (!query.favorites) {
    return catalog()
  }
  const { user } = await authenticate(request)
  const favoriteIds = new Set(
    getDb()
      .favorites.filter((record) => record.userId === user.id)
      .map((record) => record.nftId),
  )
  return catalog().filter((nft) => favoriteIds.has(nft.id))
}

const list = apiRoute('nfts.list', async ({ request }) => {
  const parsed = parseQuery(new URL(request.url))
  if ('errors' in parsed) {
    return errorResponse(400, 'BAD_REQUEST', 'Parâmetros de consulta inválidos.', parsed.errors)
  }
  const { query } = parsed
  const nfts = await listSource(request, query)
  const filtered = nfts.filter((nft) => matches(nft, query)).sort(compareNfts(query.sort))
  const start = (query.page - 1) * query.pageSize
  const body: NftListResponse = {
    items: filtered.slice(start, start + query.pageSize).map(toNftSummary),
    total: filtered.length,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(filtered.length / query.pageSize),
    facets: buildFacets(nfts, query),
  }
  return jsonResponse(body)
})

const detail = apiRoute('nfts.detail', ({ params }) => {
  const nft = catalog().find((record) => record.id === params.nftId)
  if (!nft) {
    return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
  }
  return jsonResponse(nft)
})

export const nftHandlers = [list, detail]
