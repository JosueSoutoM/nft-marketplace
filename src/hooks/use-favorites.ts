import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { FavoriteListResponse, NftSummary } from '@/api/contracts'
import { addFavorite, listFavorites, removeFavorite } from '@/api/favorites'
import { getSessionSnapshot } from '@/api/session-token'
import { useLoginRedirect } from '@/components/layout/use-login-redirect'
import { announce } from '@/lib/announcer'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from './use-session'

export const FAVORITES_STALE_TIME_MS = 30_000

interface FavoriteVariables {
  userId: string
  nft: NftSummary
  favorite: boolean
}

interface FavoriteContext {
  previous: boolean
}

function favoriteMutationKey(userId: string, nftId?: string) {
  return nftId ? (['favorites', userId, nftId] as const) : (['favorites', userId] as const)
}

function toIdSet(data: FavoriteListResponse): ReadonlySet<string> {
  return new Set(data.items.map((favorite) => favorite.nftId))
}

function isFavoriteIn(data: FavoriteListResponse | undefined, nftId: string): boolean {
  return data?.items.some((favorite) => favorite.nftId === nftId) ?? false
}

function writeFavorite(queryClient: QueryClient, userId: string, nft: NftSummary, favorite: boolean): void {
  queryClient.setQueryData<FavoriteListResponse>(queryKeys.favorites.index(userId), (data) => {
    if (!data) {
      return data
    }
    const others = data.items.filter((item) => item.nftId !== nft.id)
    const current = data.items.find((item) => item.nftId === nft.id)
    if (!favorite) {
      return { items: others }
    }
    return { items: [current ?? { nftId: nft.id, createdAt: new Date().toISOString(), nft }, ...others] }
  })
}

function isCurrentUser(userId: string): boolean {
  return getSessionSnapshot().session?.userId === userId
}

export function useFavoriteIds() {
  const { userId } = useSession()
  return useQuery({
    queryKey: queryKeys.favorites.index(userId ?? ''),
    queryFn: ({ signal }) => listFavorites({ signal }),
    enabled: userId !== null,
    staleTime: FAVORITES_STALE_TIME_MS,
    select: toIdSet,
  })
}

function useFavoriteMutation(userId: string | null, nftId: string) {
  const queryClient = useQueryClient()
  const owner = userId ?? ''

  return useMutation<unknown, Error, FavoriteVariables, FavoriteContext>({
    mutationKey: favoriteMutationKey(owner, nftId),
    scope: { id: `favorite:${owner}:${nftId}` },
    mutationFn: ({ nft, favorite }) => (favorite ? addFavorite(nft.id) : removeFavorite(nft.id)),
    onMutate: ({ userId: owner, nft, favorite }) => {
      const queryKey = queryKeys.favorites.index(owner)
      void queryClient.cancelQueries({ queryKey })
      const previous = isFavoriteIn(queryClient.getQueryData<FavoriteListResponse>(queryKey), nft.id)
      writeFavorite(queryClient, owner, nft, favorite)
      return { previous }
    },
    onSuccess: (_data, { userId: owner, nft, favorite }) => {
      if (isCurrentUser(owner)) {
        announce(favorite ? `${nft.name} foi adicionado aos favoritos.` : `${nft.name} foi removido dos favoritos.`)
      }
    },
    onError: (_error, { userId: owner, nft, favorite }, context) => {
      if (!isCurrentUser(owner) || !context) {
        return
      }
      const newerPending = queryClient.isMutating({ mutationKey: favoriteMutationKey(owner, nft.id) }) > 1
      if (!newerPending) {
        writeFavorite(queryClient, owner, nft, context.previous)
      }
      toast.error(
        favorite ? `Não foi possível favoritar ${nft.name}.` : `Não foi possível remover ${nft.name} dos favoritos.`,
        { id: `favorite-error-${nft.id}`, description: 'O estado anterior foi restaurado. Tente novamente.' },
      )
    },
    onSettled: (_data, _error, { userId: owner }) => {
      if (isCurrentUser(owner) && queryClient.isMutating({ mutationKey: favoriteMutationKey(owner) }) === 1) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(owner) })
      }
    },
  })
}

export function useFavoriteToggle(nft: NftSummary) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const redirect = useLoginRedirect()
  const { userId } = useSession()
  const favorites = useFavoriteIds()
  const mutation = useFavoriteMutation(userId, nft.id)

  function toggle() {
    if (!userId) {
      void navigate({ to: '/login', search: { redirect } })
      return
    }
    const data = queryClient.getQueryData<FavoriteListResponse>(queryKeys.favorites.index(userId))
    if (!data) {
      return
    }
    mutation.mutate({ userId, nft, favorite: !isFavoriteIn(data, nft.id) })
  }

  return {
    isFavorite: favorites.data?.has(nft.id) ?? false,
    unavailable: userId !== null && !favorites.data,
    toggle,
  }
}
