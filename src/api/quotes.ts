import type { CreateQuoteRequest, Quote } from './contracts'
import { cartOwnerHeaders } from './guest-cart'
import { http, type RequestOptions } from './http'

export async function createQuote(body: CreateQuoteRequest, { signal }: RequestOptions = {}): Promise<Quote> {
  const { data } = await http.post<Quote>('/quotes', body, { headers: cartOwnerHeaders(), signal })
  return data
}
