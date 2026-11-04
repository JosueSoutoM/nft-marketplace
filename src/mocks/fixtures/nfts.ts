import type {
  NetworkId,
  Nft,
  NftCategoryId,
  NftEdition,
  NftImage,
  NftRarity,
  NftReview,
} from '@/api/contracts'
import { multiplyEth, percentOfEth } from '@/lib/eth'
import { deterministicHex } from '../hex'
import { networkLabel } from './networks'

type ArtworkId = 'emerald-ape' | 'sage-nomad' | 'ivory-baron' | 'golden-beat'
type CollectionId = 'kurio-apes' | 'nomad-society' | 'baron-club' | 'golden-frequencies'
type StockProfile = 'normal' | 'low' | 'edition-sold-out' | 'sold-out'
type EditionSet = 'full' | 'limited' | 'open'

interface NftSeed {
  name: string
  token: string
  artwork: ArtworkId
  category: NftCategoryId
  network: NetworkId
  collection: CollectionId
  price: string
  compareAtPrice?: string
  rarity?: NftRarity
  stock?: StockProfile
  editions?: EditionSet
  trending?: boolean
  featured?: boolean
}

interface Artwork {
  widths: number[]
  alt: string
  attributes: string[]
}

const artworks: Record<ArtworkId, Artwork> = {
  'emerald-ape': {
    widths: [400, 800],
    alt: 'Macaco de óculos redondos escuros, jaqueta de colégio verde e pingente de esmeralda',
    attributes: ['Óculos', 'Esmeralda'],
  },
  'sage-nomad': {
    widths: [400, 500],
    alt: 'Gorila de chapéu bucket verde-claro e moletom roxo',
    attributes: ['Chapéu bucket', 'Moletom'],
  },
  'ivory-baron': {
    widths: [400, 500],
    alt: 'Gorila de pelagem escura com blazer creme e gola alta verde',
    attributes: ['Blazer', 'Gola alta'],
  },
  'golden-beat': {
    widths: [400, 500],
    alt: 'Macaco de pelagem dourada com fones de ouvido verdes e jaqueta clara',
    attributes: ['Fones', 'Jaqueta clara'],
  },
}

const collections: Record<CollectionId, { name: string; creatorId: string; creatorName: string }> = {
  'kurio-apes': { name: 'Kurio Apes', creatorId: 'nova-sato', creatorName: 'Nova Sato' },
  'nomad-society': { name: 'Nomad Society', creatorId: 'ravi-okafor', creatorName: 'Ravi Okafor' },
  'baron-club': { name: 'Baron Club', creatorId: 'lia-montenegro', creatorName: 'Lia Montenegro' },
  'golden-frequencies': { name: 'Golden Frequencies', creatorId: 'theo-varga', creatorName: 'Theo Varga' },
}

const rarityLabels: Record<NftRarity, string> = {
  common: 'Comum',
  rare: 'Raro',
  legendary: 'Lendário',
}

const seeds: NftSeed[] = [
  { name: 'Emerald Ape', token: '042', artwork: 'emerald-ape', category: 'digital-art', network: 'ethereum', collection: 'kurio-apes', price: '1.19', rarity: 'rare', editions: 'full', trending: true, featured: true },
  { name: 'Sage Nomad', token: '009', artwork: 'sage-nomad', category: 'digital-art', network: 'ethereum', collection: 'nomad-society', price: '1.69', stock: 'edition-sold-out', editions: 'full', featured: true },
  { name: 'Neon Vessel', token: '552', artwork: 'ivory-baron', category: '3d-art', network: 'polygon', collection: 'baron-club', price: '1.99', compareAtPrice: '2.29', rarity: 'rare', stock: 'low', editions: 'full', trending: true },
  { name: 'Cosmic Bloom', token: '118', artwork: 'sage-nomad', category: 'generative', network: 'solana', collection: 'nomad-society', price: '1.29', editions: 'full' },
  { name: 'Violet Nomad', token: '314', artwork: 'sage-nomad', category: 'digital-art', network: 'polygon', collection: 'nomad-society', price: '1.39', editions: 'full', trending: true },
  { name: 'Ivory Baron', token: '088', artwork: 'ivory-baron', category: 'collectibles', network: 'ethereum', collection: 'baron-club', price: '1.79', editions: 'full', featured: true },
  { name: 'Golden Beat', token: '207', artwork: 'golden-beat', category: 'music', network: 'ethereum', collection: 'golden-frequencies', price: '0.99', editions: 'full', trending: true, featured: true },
  { name: 'Golden Frequency', token: '071', artwork: 'golden-beat', category: 'music', network: 'polygon', collection: 'golden-frequencies', price: '0.59', editions: 'open' },
  { name: 'Golden Signal', token: '160', artwork: 'golden-beat', category: 'music', network: 'solana', collection: 'golden-frequencies', price: '0.39', editions: 'open' },
  { name: 'Jade Monarch', token: '013', artwork: 'emerald-ape', category: 'collectibles', network: 'ethereum', collection: 'kurio-apes', price: '12.30', rarity: 'legendary', editions: 'limited', trending: true },
  { name: 'Amber Sentinel', token: '231', artwork: 'emerald-ape', category: '3d-art', network: 'ethereum', collection: 'kurio-apes', price: '2.45', editions: 'full' },
  { name: 'Velvet Drifter', token: '402', artwork: 'sage-nomad', category: 'photography', network: 'polygon', collection: 'nomad-society', price: '0.42', editions: 'open' },
  { name: 'Quiet Summit', token: '077', artwork: 'sage-nomad', category: 'photography', network: 'solana', collection: 'nomad-society', price: '0.18', editions: 'open' },
  { name: 'Marble Regent', token: '019', artwork: 'ivory-baron', category: 'digital-art', network: 'ethereum', collection: 'baron-club', price: '4.20', rarity: 'rare', editions: 'limited' },
  { name: 'Obsidian Chair', token: '640', artwork: 'ivory-baron', category: '3d-art', network: 'solana', collection: 'baron-club', price: '0.85', editions: 'full' },
  { name: 'Bass Prophet', token: '333', artwork: 'golden-beat', category: 'music', network: 'ethereum', collection: 'golden-frequencies', price: '1.05', editions: 'full', trending: true },
  { name: 'Lo-Fi Monk', token: '128', artwork: 'golden-beat', category: 'music', network: 'polygon', collection: 'golden-frequencies', price: '0.27', editions: 'open' },
  { name: 'Pixel Grove', token: '256', artwork: 'emerald-ape', category: 'generative', network: 'polygon', collection: 'kurio-apes', price: '0.33', editions: 'open' },
  { name: 'Fractal Canopy', token: '512', artwork: 'emerald-ape', category: 'generative', network: 'solana', collection: 'kurio-apes', price: '0.64', compareAtPrice: '0.80', editions: 'full' },
  { name: 'Arcade Tamarin', token: '099', artwork: 'golden-beat', category: 'gaming', network: 'polygon', collection: 'golden-frequencies', price: '0.12', editions: 'open' },
  { name: 'Quest Gorilla', token: '145', artwork: 'sage-nomad', category: 'gaming', network: 'solana', collection: 'nomad-society', price: '0.21', editions: 'open' },
  { name: 'Boss Level', token: '301', artwork: 'emerald-ape', category: 'gaming', network: 'ethereum', collection: 'kurio-apes', price: '0.75', stock: 'low', editions: 'limited' },
  { name: 'Season Pass', token: '001', artwork: 'ivory-baron', category: 'subscriptions', network: 'ethereum', collection: 'baron-club', price: '0.50', editions: 'open' },
  { name: 'Studio Key', token: '002', artwork: 'golden-beat', category: 'subscriptions', network: 'polygon', collection: 'golden-frequencies', price: '0.08', editions: 'open' },
  { name: 'Backstage Token', token: '444', artwork: 'golden-beat', category: 'utility', network: 'ethereum', collection: 'golden-frequencies', price: '0.05', editions: 'open' },
  { name: 'Vault Access', token: '808', artwork: 'ivory-baron', category: 'utility', network: 'polygon', collection: 'baron-club', price: '0.02', editions: 'open' },
  { name: 'Guild Badge', token: '212', artwork: 'emerald-ape', category: 'utility', network: 'solana', collection: 'kurio-apes', price: '0.15', editions: 'open' },
  { name: 'Copper Dreamer', token: '377', artwork: 'sage-nomad', category: 'digital-art', network: 'solana', collection: 'nomad-society', price: '0.95', editions: 'full' },
  { name: 'Midnight Patron', token: '090', artwork: 'ivory-baron', category: 'digital-art', network: 'polygon', collection: 'baron-club', price: '2.10', stock: 'edition-sold-out', editions: 'full' },
  { name: 'Saffron Echo', token: '188', artwork: 'golden-beat', category: 'digital-art', network: 'ethereum', collection: 'golden-frequencies', price: '1.49', editions: 'full' },
  { name: 'Lens Wanderer', token: '063', artwork: 'sage-nomad', category: 'photography', network: 'ethereum', collection: 'nomad-society', price: '0.66', editions: 'limited' },
  { name: 'Silver Frame', token: '271', artwork: 'ivory-baron', category: 'photography', network: 'ethereum', collection: 'baron-club', price: '1.12', editions: 'limited' },
  { name: 'Clay Totem', token: '355', artwork: 'emerald-ape', category: '3d-art', network: 'polygon', collection: 'kurio-apes', price: '3.05', editions: 'full' },
  { name: 'Chrome Idol', token: '721', artwork: 'ivory-baron', category: '3d-art', network: 'ethereum', collection: 'baron-club', price: '6.80', rarity: 'legendary', editions: 'limited', trending: true },
  { name: 'Relic Hunter', token: '054', artwork: 'emerald-ape', category: 'collectibles', network: 'solana', collection: 'kurio-apes', price: '0.88', editions: 'full' },
  { name: 'Coin Keeper', token: '116', artwork: 'golden-beat', category: 'collectibles', network: 'polygon', collection: 'golden-frequencies', price: '0.47', stock: 'low', editions: 'open' },
  { name: 'Woven Signal', token: '489', artwork: 'sage-nomad', category: 'generative', network: 'ethereum', collection: 'nomad-society', price: '1.75', editions: 'limited' },
  { name: 'Tidal Loop', token: '590', artwork: 'golden-beat', category: 'generative', network: 'polygon', collection: 'golden-frequencies', price: '0.36', editions: 'open' },
  { name: 'Night Shift', token: '263', artwork: 'ivory-baron', category: 'gaming', network: 'ethereum', collection: 'baron-club', price: '0.69', editions: 'limited' },
  { name: 'Echo Chamber', token: '348', artwork: 'golden-beat', category: 'music', network: 'solana', collection: 'golden-frequencies', price: '0.24', editions: 'open' },
  { name: 'Canvas Nomad', token: '027', artwork: 'sage-nomad', category: 'digital-art', network: 'ethereum', collection: 'nomad-society', price: '2.75', rarity: 'rare', editions: 'full' },
  { name: 'Emerald Heir', token: '043', artwork: 'emerald-ape', category: 'digital-art', network: 'polygon', collection: 'kurio-apes', price: '1.59', editions: 'full' },
  { name: 'Ivory Archive', token: '089', artwork: 'ivory-baron', category: 'collectibles', network: 'solana', collection: 'baron-club', price: '0.31', editions: 'open' },
  { name: 'Golden Hour', token: '208', artwork: 'golden-beat', category: 'photography', network: 'polygon', collection: 'golden-frequencies', price: '0.55', editions: 'limited' },
  { name: 'Last Light', token: '999', artwork: 'sage-nomad', category: 'collectibles', network: 'ethereum', collection: 'nomad-society', price: '0.99', stock: 'sold-out', editions: 'full' },
  { name: 'Ember Scout', token: '150', artwork: 'emerald-ape', category: 'digital-art', network: 'solana', collection: 'kurio-apes', price: '0.79', stock: 'low', editions: 'limited' },
]

const CATALOG_DATE = Date.UTC(2026, 9, 31, 12)
const DAY_MS = 86_400_000
const NEW_RELEASE_COUNT = 12

const reviewPool: Array<Pick<NftReview, 'author' | 'rating' | 'comment'>> = [
  { author: 'Marina Costa', rating: 5, comment: 'Acabamento impecável e procedência clara. Entrou direto para a vitrine da minha coleção.' },
  { author: 'Diego Albuquerque', rating: 5, comment: 'A arte em alta resolução é ainda melhor do que a prévia. Entrega rápida na carteira.' },
  { author: 'Helena Prado', rating: 4, comment: 'Ótima peça para quem acompanha o criador. Gostaria de mais detalhes sobre os lançamentos futuros.' },
  { author: 'Caio Nogueira', rating: 5, comment: 'Os atributos são coerentes com a coleção e o contrato é verificado. Recomendo.' },
  { author: 'Lívia Moura', rating: 4, comment: 'Edição bem equilibrada entre raridade e preço. A comunidade é muito ativa.' },
  { author: 'Rafael Antunes', rating: 5, comment: 'Uma das melhores obras da coleção. Os direitos autorais para o criador fazem diferença.' },
]

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildImage(artwork: ArtworkId, alt: string): NftImage {
  const { widths } = artworks[artwork]
  const sources = widths.map((width) => ({ src: `/images/nfts/${artwork}-${width}.webp`, width }))
  return { alt, src: sources[0].src, width: widths[0], height: widths[0], sources }
}

function buildEditions(seed: NftSeed, index: number): NftEdition[] {
  const set = seed.editions ?? 'full'
  const unique: NftEdition = {
    id: 'unique',
    label: '1/1',
    kind: 'unique',
    supply: 1,
    available: 1,
    maxPerOrder: 1,
    price: multiplyEth(seed.price, 5),
    compareAtPrice: null,
  }
  const limitedTen: NftEdition = {
    id: 'limited-10',
    label: '1/10',
    kind: 'limited',
    supply: 10,
    available: 3 + (index % 7),
    maxPerOrder: 3,
    price: multiplyEth(seed.price, 2),
    compareAtPrice: null,
  }
  const limitedFifty: NftEdition = {
    id: 'limited-50',
    label: '1/50',
    kind: 'limited',
    supply: 50,
    available: 12 + ((index * 7) % 38),
    maxPerOrder: 10,
    price: seed.price,
    compareAtPrice: seed.compareAtPrice ?? null,
  }
  const open: NftEdition = {
    id: 'open',
    label: 'Aberta',
    kind: 'open',
    supply: 1000,
    available: 600 + ((index * 37) % 400),
    maxPerOrder: 20,
    price: percentOfEth(seed.price, '50'),
    compareAtPrice: null,
  }

  const editions =
    set === 'full' ? [unique, limitedTen, limitedFifty, open] : set === 'limited' ? [limitedTen, limitedFifty] : [limitedFifty, open]

  return editions.map((edition) => {
    switch (seed.stock) {
      case 'low':
        return { ...edition, available: edition.kind === 'open' ? 3 : Math.min(edition.available, edition.id === 'limited-50' ? 2 : 1) }
      case 'edition-sold-out':
        return edition.id === 'unique' || edition.id === 'limited-10' ? { ...edition, available: 0 } : edition
      case 'sold-out':
        return { ...edition, available: 0 }
      default:
        return edition
    }
  })
}

function buildReviews(id: string, index: number, count: number): NftReview[] {
  return Array.from({ length: Math.min(count, 3) }, (_, offset) => {
    const review = reviewPool[(index + offset * 2) % reviewPool.length]
    return {
      id: `${id}-review-${offset + 1}`,
      ...review,
      createdAt: new Date(CATALOG_DATE - (offset + 1) * 5 * DAY_MS).toISOString(),
    }
  })
}

function buildNft(seed: NftSeed, index: number): Nft {
  const fullName = `${seed.name} #${seed.token}`
  const id = slugify(fullName)
  const collection = collections[seed.collection]
  const artwork = artworks[seed.artwork]
  const rarity = seed.rarity ?? 'common'
  const network = networkLabel(seed.network)
  const isEmeraldApe = id === 'emerald-ape-042'
  const image = buildImage(seed.artwork, `${fullName}: ${artwork.alt}`)
  const editions = buildEditions(seed, index)
  const defaultEdition = editions.find((edition) => edition.id === 'limited-50') ?? editions[0]
  const ratingCount = isEmeraldApe ? 19 : 3 + ((index * 7) % 40)

  return {
    id,
    name: fullName,
    tokenId: seed.token.padStart(4, '0'),
    image,
    category: seed.category,
    network: seed.network,
    collection: { id: seed.collection, name: collection.name },
    creator: { id: collection.creatorId, name: collection.creatorName },
    rarity,
    editions,
    defaultEditionId: defaultEdition.id,
    price: defaultEdition.price,
    compareAtPrice: defaultEdition.compareAtPrice,
    isNewRelease: index < NEW_RELEASE_COUNT,
    isTrending: seed.trending ?? false,
    isFeatured: seed.featured ?? false,
    listedAt: new Date(CATALOG_DATE - index * 2 * DAY_MS).toISOString(),
    version: 1,
    description: `Um colecionável digital finalizado à mão da coleção ${isEmeraldApe ? 'Kurio Editions' : collection.name}, verificado na ${network}, com arte desbloqueável e acesso para colecionadores.`,
    story: [
      `${fullName} é uma obra digital ${defaultEdition.label} finalizada à mão da coleção ${isEmeraldApe ? 'Kurio Editions' : collection.name}. Cada atributo fica armazenado nos metadados do token e verificado na ${network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${collection.creatorName} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    networkInfo: `Cunhado na ${network} com procedência imutável e metadados armazenados no IPFS.`,
    contract: {
      address: isEmeraldApe ? '0x7A42c3B19f05E8d6A2b4C7e9D1f3a5B8c0E219E8' : `0x${deterministicHex(id, 40)}`,
      standard: 'ERC-721',
      royaltyPercent: '5',
    },
    attributes: [...artwork.attributes, rarityLabels[rarity]],
    gallery: Array.from({ length: 4 }, (_, position) =>
      buildImage(seed.artwork, `${fullName}, imagem ${position + 1} de 4: ${artwork.alt}`),
    ),
    rating: {
      average: isEmeraldApe ? 5 : Math.min(50, 36 + ((index * 3) % 15)) / 10,
      count: ratingCount,
    },
    reviews: buildReviews(id, index, ratingCount),
  }
}

export function buildNftFixtures(): Nft[] {
  return seeds.map(buildNft)
}
