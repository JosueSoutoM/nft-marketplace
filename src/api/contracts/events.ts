import type { IsoDateTime } from './common'
import type { NftEdition } from './nfts'
import type { Order } from './orders'

export const REALTIME_PATH = '/realtime'
export const REALTIME_EVENT_TYPES = ['nft.updated', 'order.updated'] as const
export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number]

export interface RealtimeAuth {
  token?: string
}

export interface RealtimeEvent<TType extends RealtimeEventType, TResource extends string, TData> {
  id: string
  type: TType
  resource: {
    type: TResource
    id: string
  }
  version: number
  userId: string | null
  occurredAt: IsoDateTime
  data: TData
}

export type NftUpdatedEvent = RealtimeEvent<
  'nft.updated',
  'nft',
  {
    editions: NftEdition[]
    price: NftEdition['price']
    compareAtPrice: NftEdition['compareAtPrice']
  }
>

export type OrderUpdatedEvent = RealtimeEvent<'order.updated', 'order', Order>

export type ServerEvent = NftUpdatedEvent | OrderUpdatedEvent
