import { IDEMPOTENCY_HEADER, type CreateOrderRequest, type Order, type OrderListQuery, type OrderListResponse } from './contracts'
import { http, type RequestOptions } from './http'

export interface CreateOrderOptions extends RequestOptions {
  idempotencyKey: string
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

export async function createOrder(
  body: CreateOrderRequest,
  { idempotencyKey, signal }: CreateOrderOptions,
): Promise<Order> {
  const { data } = await http.post<Order>('/orders', body, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    signal,
  })
  return data
}

export async function listOrders(query: OrderListQuery = {}, { signal }: RequestOptions = {}): Promise<OrderListResponse> {
  const { data } = await http.get<OrderListResponse>('/orders', { params: query, signal })
  return data
}

export async function getOrder(orderId: string, { signal }: RequestOptions = {}): Promise<Order> {
  const { data } = await http.get<Order>(`/orders/${encodeURIComponent(orderId)}`, { signal })
  return data
}
