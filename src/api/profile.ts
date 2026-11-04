import { AVATAR_FORM_FIELD, type ChangePasswordRequest, type Profile, type UpdateProfileRequest } from './contracts'
import { http, type RequestOptions } from './http'

export async function getProfile({ signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.get<Profile>('/profile', { signal })
  return data
}

export async function updateProfile(body: UpdateProfileRequest, { signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.patch<Profile>('/profile', body, { signal })
  return data
}

export async function updateAvatar(file: File, { signal }: RequestOptions = {}): Promise<Profile> {
  const form = new FormData()
  form.append(AVATAR_FORM_FIELD, file)
  const { data } = await http.put<Profile>('/profile/avatar', form, { signal })
  return data
}

export async function removeAvatar({ signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.delete<Profile>('/profile/avatar', { signal })
  return data
}

export async function changePassword(body: ChangePasswordRequest, { signal }: RequestOptions = {}): Promise<void> {
  await http.post('/profile/password', body, { signal })
}
