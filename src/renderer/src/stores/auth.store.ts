import { create } from 'zustand'

const api = () => window.api

export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  provider: string
}

interface AuthSession {
  authenticated: boolean
  user: AuthUser | null
  expiresAt: number | null
  profileCompleted: boolean
}

type AuthStatus = 'loading' | 'authenticating' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  expiresAt: number | null
  profileCompleted: boolean
  error: string | null
  restoreSession: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  completeProfile: (displayName: string) => Promise<void>
  updateProfile: (payload: { displayName?: string | null; avatarUrl?: string | null; email?: string | null }) => Promise<void>
  signOutAllDevices: () => Promise<void>
  deleteAccount: () => Promise<void>
  initSessionListener: () => () => void
}

function applySession(set: (partial: Partial<AuthState>) => void, session: AuthSession): void {
  set({
    status: session.authenticated ? 'authenticated' : 'unauthenticated',
    user: session.user,
    expiresAt: session.expiresAt,
    profileCompleted: session.profileCompleted,
    error: null
  })
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  expiresAt: null,
  profileCompleted: false,
  error: null,

  restoreSession: async () => {
    set({ status: 'loading', error: null })
    try {
      const session = await api().auth.restoreSession()
      applySession(set, session)
    } catch {
      set({
        status: 'unauthenticated',
        user: null,
        expiresAt: null,
        profileCompleted: false,
        error: 'Failed to restore your account session.'
      })
    }
  },

  signInWithGoogle: async () => {
    set({ status: 'authenticating', error: null })
    try {
      await api().auth.signInWithGoogle()
    } catch {
      set({
        status: 'unauthenticated',
        error: 'Unable to open Google sign-in. Please try again.'
      })
    }
  },

  signInWithEmail: async (email, password) => {
    set({ status: 'authenticating', error: null })
    try {
      const session = await api().auth.signInWithEmail(email, password)
      applySession(set, session)
    } catch (err) {
      set({
        status: 'unauthenticated',
        error: err instanceof Error ? err.message : 'Sign in failed. Please try again.'
      })
    }
  },

  signUpWithEmail: async (email, password) => {
    set({ status: 'authenticating', error: null })
    try {
      const session = await api().auth.signUpWithEmail(email, password)
      if (!session.authenticated) {
        set({ status: 'unauthenticated', error: null })
        return { needsConfirmation: true }
      }
      applySession(set, session)
      return { needsConfirmation: false }
    } catch (err) {
      set({
        status: 'unauthenticated',
        error: err instanceof Error ? err.message : 'Sign up failed. Please try again.'
      })
      return { needsConfirmation: false }
    }
  },

  signOut: async () => {
    await api().auth.signOut()
    set({
      status: 'unauthenticated',
      user: null,
      expiresAt: null,
      profileCompleted: false,
      error: null
    })
  },

  refreshProfile: async () => {
    try {
      const profile = await api().auth.getProfile()
      set((s) => ({
        user: profile.user ?? s.user,
        profileCompleted: profile.profileCompleted,
        status: profile.user ? 'authenticated' : 'unauthenticated'
      }))
    } catch {
      set({ error: 'Failed to refresh profile.' })
    }
  },

  completeProfile: async (displayName) => {
    const session = await api().auth.completeProfile(displayName)
    applySession(set, session)
  },

  updateProfile: async (payload) => {
    const session = await api().auth.updateProfile(payload)
    applySession(set, session)
  },

  signOutAllDevices: async () => {
    await api().auth.signOutAllDevices()
    set({
      status: 'unauthenticated',
      user: null,
      expiresAt: null,
      profileCompleted: false,
      error: null
    })
  },

  deleteAccount: async () => {
    await api().auth.deleteAccount()
    set({
      status: 'unauthenticated',
      user: null,
      expiresAt: null,
      profileCompleted: false,
      error: null
    })
  },

  initSessionListener: () => {
    return api().onAuthSessionChanged((session) => {
      applySession(set, session)
    })
  }
}))
