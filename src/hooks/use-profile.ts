import { useQuery } from '@tanstack/react-query'
import { getProfile } from '@/api/profile'
import { queryKeys } from '@/lib/query-keys'
import { useSession } from './use-session'

export function useProfile() {
  const { userId } = useSession()
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: ({ signal }) => getProfile({ signal }),
    enabled: userId !== null,
    staleTime: 60_000,
  })
}
