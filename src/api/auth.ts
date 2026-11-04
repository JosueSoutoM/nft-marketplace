import type { AuthResponse, LoginRequest, RegisterRequest, Session } from './contracts'
import { http, type RequestOptions } from './http'

export async function register(body: RegisterRequest, { signal }: RequestOptions = {}): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/register', body, { signal })
  return data
}

export async function login(body: LoginRequest, { signal }: RequestOptions = {}): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/auth/login', body, { signal })
  return data
}

export async function getSession({ signal }: RequestOptions = {}): Promise<Session> {
  const { data } = await http.get<Session>('/auth/session', { signal })
  return data
}

export async function logout({ signal }: RequestOptions = {}): Promise<void> {
  await http.post('/auth/logout', null, { signal })
}
