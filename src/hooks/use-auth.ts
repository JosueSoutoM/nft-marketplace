import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { login, logout, register } from '@/api/auth'
import { mergeGuestCart } from '@/api/cart'
import type { AuthResponse, AvailabilityIssue, Cart, LoginRequest, Nft, RegisterRequest } from '@/api/contracts'
import { endSession, getSessionSnapshot, saveSession } from '@/api/session-token'
import { announce } from '@/lib/announcer'
import { queryKeys } from '@/lib/query-keys'
import { clearResumeDrafts } from '@/lib/session-resume'

function describeAdjustment(queryClient: QueryClient, cart: Cart, issue: AvailabilityIssue): string {
  const item = cart.items.find((entry) => entry.nftId === issue.nftId && entry.editionId === issue.editionId)
  const name =
    item?.name ?? queryClient.getQueryData<Nft>(queryKeys.nfts.detail(issue.nftId))?.name ?? 'Um item do carrinho'
  const edition = item ? ` (edição ${item.editionLabel})` : ''
  if (issue.maxQuantity === 0) {
    return `${name}${edition} está esgotado e foi removido.`
  }
  const reason = issue.reason === 'STOCK' ? 'estoque disponível' : 'limite por pedido'
  return `${name}${edition} foi ajustado para ${issue.maxQuantity} ${issue.maxQuantity === 1 ? 'unidade' : 'unidades'} (${reason}).`
}

async function mergeVisitorCart(queryClient: QueryClient, userId: string): Promise<void> {
  try {
    const result = await mergeGuestCart()
    if (!result) {
      return
    }
    await queryClient.cancelQueries({ queryKey: queryKeys.cart(userId) })
    queryClient.setQueryData(queryKeys.cart(userId), result.cart)
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotes.all(userId) })
    if (result.adjustments.length > 0) {
      toast.warning('Seu carrinho foi ajustado', {
        id: 'cart-merge-adjustments',
        description: result.adjustments.map((issue) => describeAdjustment(queryClient, result.cart, issue)).join(' '),
        duration: 10_000,
      })
    }
  } catch {
    toast.error('Não foi possível juntar o carrinho de visitante', {
      id: 'cart-merge-failed',
      description: 'Os itens continuam guardados e serão incluídos no próximo acesso.',
    })
  }
}

async function completeSignIn(queryClient: QueryClient, { token, session }: AuthResponse): Promise<void> {
  clearResumeDrafts(session.user.id)
  queryClient.setQueryData(queryKeys.session(session.user.id), session)
  saveSession({ token, userId: session.user.id })
  await mergeVisitorCart(queryClient, session.user.id)
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginRequest) => login(body),
    onSuccess: async (response) => {
      await completeSignIn(queryClient, response)
      announce(`Você entrou como ${response.session.user.displayName}.`)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterRequest) => register(body),
    onSuccess: async (response) => {
      await completeSignIn(queryClient, response)
      announce(`Conta criada. Você entrou como ${response.session.user.displayName}.`)
    },
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      if (!getSessionSnapshot().session) {
        return
      }
      try {
        await logout()
      } finally {
        endSession('logout')
        clearResumeDrafts()
      }
    },
    onSettled: () => announce('Você saiu da sua conta.'),
  })
}
