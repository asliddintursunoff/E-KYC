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
function isMeaningfulString(value: string): boolean {
  return value.trim().length > 0 && value !== 'None' && value !== 'null'
}

function formatErrorData(data: unknown): string | null {
  if (typeof data === 'string') return isMeaningfulString(data) ? data : null
  if (Array.isArray(data)) {
    return data
      .map((item) => formatErrorData(item))
      .filter((item): item is string => Boolean(item))
      .join(' ')
  }
  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => {
        const message = formatErrorData(value)
        if (!message) return null
        const label = key === 'non_field_errors' ? '' : `${key.replace(/_/g, ' ')}: `
        return `${label}${message}`
      })
      .filter((item): item is string => Boolean(item))
    return entries.join(' ')
  }
  return null
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as unknown
    if (data) {
      if (typeof data === 'object' && data !== null) {
        const typed = data as Record<string, unknown>
        if (typeof typed.detail === 'string') return typed.detail
        if (typeof typed.error === 'string') return typed.error
        if (typeof typed.message === 'string') return typed.message
      }
      const formatted = formatErrorData(data)
      if (formatted) return formatted
    }
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return fallback
}
