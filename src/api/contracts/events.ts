import type { IsoDateTime } from './common'
import type { NftEdition } from './nfts'
import type { Order } from './orders'

export interface RealtimeEvent<TType extends string, TResource extends string, TData> {
  id: string
  type: TType
  resource: {
    type: TResource
    id: string
  }
  version: number
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
