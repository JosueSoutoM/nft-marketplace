import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NetworkId, Wallet, WalletConnection, WalletListResponse } from '@/api/contracts'
import { getSessionSnapshot } from '@/api/session-token'
import { connectWallet, disconnectWallet, listWallets } from '@/api/wallets'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from './use-session'

export function useWallets() {
  const { userId } = useSession()
  return useQuery({
    queryKey: queryKeys.wallets(userId ?? ''),
    queryFn: ({ signal }) => listWallets({ signal }),
    enabled: userId !== null,
    staleTime: 30_000,
    select: (data) => data.items,
  })
}

function useConnectionMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<WalletConnection>) {
  const queryClient = useQueryClient()
  const { userId } = useSession()
  return useMutation<WalletConnection, Error, TVariables>({
    mutationFn,
    onSuccess: (connection) => {
      if (!userId || getSessionSnapshot().session?.userId !== userId) {
        return
      }
      queryClient.setQueryData<WalletListResponse>(queryKeys.wallets(userId), (data) =>
        data && {
          items: data.items.map((wallet): Wallet => (wallet.id === connection.walletId ? { ...wallet, connection } : wallet)),
        },
      )
    },
    onError: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wallets(userId) })
      }
    },
  })
}

export function useConnectWallet() {
  return useConnectionMutation(({ walletId, network }: { walletId: string; network: NetworkId }) =>
    connectWallet(walletId, { network }),
  )
}

export function useDisconnectWallet() {
  return useConnectionMutation(({ walletId }: { walletId: string }) => disconnectWallet(walletId))
}

export function isConnectedOn(wallet: Wallet | undefined, network: NetworkId | null): boolean {
  return !!wallet && wallet.connection?.status === 'connected' && wallet.connection.network === network
}
