import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { ChangePasswordRequest, Profile, Session, UpdateProfileRequest } from '@/api/contracts'
import { changePassword, getProfile, removeAvatar, updateAvatar, updateProfile } from '@/api/profile'
import { getSessionSnapshot } from '@/api/session-token'
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

function storeProfile(queryClient: QueryClient, userId: string, profile: Profile): void {
  if (getSessionSnapshot().session?.userId !== userId || profile.id !== userId) {
    return
  }
  queryClient.setQueryData(queryKeys.profile(userId), profile)
  queryClient.setQueryData<Session>(queryKeys.session(userId), (session) =>
    session && {
      ...session,
      user: {
        ...session.user,
        email: profile.email,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
    },
  )
}

function useProfileMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Profile>) {
  const queryClient = useQueryClient()
  const { userId } = useSession()
  return useMutation<Profile, Error, TVariables>({
    mutationFn,
    onSuccess: (profile) => {
      if (userId) {
        storeProfile(queryClient, userId, profile)
      }
    },
  })
}

export function useUpdateProfile() {
  return useProfileMutation((body: UpdateProfileRequest) => updateProfile(body))
}

export function useUpdateAvatar() {
  return useProfileMutation((file: File) => updateAvatar(file))
}

export function useRemoveAvatar() {
  return useProfileMutation<void>(() => removeAvatar())
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => changePassword(body),
  })
}
