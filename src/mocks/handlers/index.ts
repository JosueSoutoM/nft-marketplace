import type { RequestHandler, WebSocketHandler } from 'msw'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { favoriteHandlers } from './favorites'
import { networkHandlers } from './networks'
import { nftHandlers } from './nfts'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { quoteHandlers } from './quotes'
import { walletHandlers } from './wallets'

export const handlers: Array<RequestHandler | WebSocketHandler> = [
  ...authHandlers,
  ...nftHandlers,
  ...networkHandlers,
  ...favoriteHandlers,
  ...cartHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
]
