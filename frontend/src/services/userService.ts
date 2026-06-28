import { apiClient } from '@/services/apiClient'
import type { UserProfile } from '@/types/api'

export const userService = {
  async getMe(): Promise<UserProfile> {
    const { data } = await apiClient.get<UserProfile>('/api/users/me/')
    return data
  },
}
