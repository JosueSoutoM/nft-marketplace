import { NETWORK_IDS, type NetworkId } from '@/api/contracts'
import { errorResponse, jsonResponse } from '../responses'
import { getOrCreateCart, resolveCartOwner } from '../services/carts'
import { issueQuote } from '../services/quotes'
import { apiRoute, readJsonBody, stringField } from './route'

const create = apiRoute('quotes.create', async ({ request }) => {
  const owner = await resolveCartOwner(request)
  const body = await readJsonBody(request)
  const network = stringField(body, 'network')
  if (!(NETWORK_IDS as readonly string[]).includes(network)) {
    return errorResponse(422, 'VALIDATION_ERROR', 'Selecione uma rede válida.', { network: 'Selecione uma rede válida.' })
  }
  const cart = getOrCreateCart(owner)
  if (cart.items.length === 0) {
    return errorResponse(422, 'CART_EMPTY', 'Seu carrinho está vazio.')
  }
  return jsonResponse(issueQuote(cart, network as NetworkId), 201)
})

export const quoteHandlers = [create]
