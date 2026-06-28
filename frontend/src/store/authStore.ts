import { create } from 'zustand'
import { tokenStorage } from '@/utils/tokenStorage'
import type { UserProfile } from '@/types/api'

interface AuthState {
  isAuthenticated: boolean
  profile: UserProfile | null
  selfieVerificationToken: string | null
  temporaryLoginToken: string | null

  setTokens: (accessToken: string, refreshToken: string) => void
  setProfile: (profile: UserProfile) => void
  setSelfieVerificationToken: (token: string) => void
  setTemporaryLoginToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: tokenStorage.hasSession(),
  profile: null,
  selfieVerificationToken: null,
  temporaryLoginToken: null,

  setTokens: (accessToken, refreshToken) => {
    tokenStorage.setTokens(accessToken, refreshToken)
    set({ isAuthenticated: true })
  },

  setProfile: (profile) => set({ profile }),

  setSelfieVerificationToken: (token) => set({ selfieVerificationToken: token }),

  setTemporaryLoginToken: (token) => set({ temporaryLoginToken: token }),

  logout: () => {
    tokenStorage.clear()
    set({
      isAuthenticated: false,
      profile: null,
      selfieVerificationToken: null,
      temporaryLoginToken: null,
    })
  },
}))
