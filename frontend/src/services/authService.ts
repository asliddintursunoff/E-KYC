import { apiClient } from '@/services/apiClient'
import type { LoginPayload, LoginResponse, RegisterPayload, RegisterResponse } from '@/types/api'

export const authService = {
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    const { data } = await apiClient.post<RegisterResponse>('/api/users/register/', payload)
    return data
  },

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>('/api/users/login/', payload)
    return data
  },
}
