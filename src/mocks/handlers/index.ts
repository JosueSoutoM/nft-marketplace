import type { RequestHandler, WebSocketHandler } from 'msw'
import { authHandlers } from './auth'
import { nftHandlers } from './nfts'

export const handlers: Array<RequestHandler | WebSocketHandler> = [...authHandlers, ...nftHandlers]
