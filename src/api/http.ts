import axios from 'axios'
import { API_BASE_PATH } from './contracts'
import { toApiError } from './errors'
import { getSessionToken } from './session-token'

const DEFAULT_TIMEOUT_MS = 10_000

export interface RequestOptions {
  signal?: AbortSignal
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? API_BASE_PATH,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = getSessionToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
