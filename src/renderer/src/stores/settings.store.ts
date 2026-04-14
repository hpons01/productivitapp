import { create } from 'zustand'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

interface SettingsState {
  settings: Record<string, string>
  loading: boolean
  initialized: boolean
  loadSettings: () => Promise<void>
  getSetting: (key: string, defaultValue?: string) => string
  setSetting: (key: string, value: string) => Promise<void>
  resetOnboarding: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,
  initialized: false,

  loadSettings: async () => {
    set({ loading: true })
    try {
      const all = await api().settings.getAll()
      // Merge with current state so concurrent setSetting calls aren't overwritten
      set((s) => ({ settings: { ...all, ...s.settings }, loading: false, initialized: true }))
    } catch {
      set({ loading: false, initialized: true })
    }
  },

  getSetting: (key, defaultValue = '') => {
    return get().settings[key] ?? defaultValue
  },

  setSetting: async (key, value) => {
    await api().settings.set(key, value)
    set((s) => ({ settings: { ...s.settings, [key]: value } }))
  },

  resetOnboarding: async () => {
    await api().settings.resetOnboarding()
    set((s) => {
      const {
        user_name: _userName,
        commitment_statement: _commitment,
        core_values: _coreValues,
        primary_value: _primaryValue,
        ...rest
      } = s.settings
      return {
        settings: {
          ...rest,
          selected_character_class: 'apprentice',
          onboarding_completed: 'false'
        }
      }
    })

    const { refreshFromDB, loadCharacterClassConfig } = useGamificationStore.getState()
    await Promise.all([refreshFromDB(), loadCharacterClassConfig()])
  }
}))
