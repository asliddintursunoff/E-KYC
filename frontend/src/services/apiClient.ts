import axios, { type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/utils/env'
import { tokenStorage } from '@/utils/tokenStorage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = tokenStorage.getAccessToken()
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 401) {
        tokenStorage.clear()
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Extracts a human-readable message from an Axios/unknown error.
 * Backend error shapes can vary, so this checks the common DRF patterns.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string; error?: string; message?: string }
      | undefined
    if (data?.detail) return data.detail
    if (data?.error) return data.error
    if (data?.message) return data.message
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return fallback
}
