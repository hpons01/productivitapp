import { create } from 'zustand'

const api = () => window.api

interface SettingsState {
  settings: Record<string, string>
  loading: boolean
  loadSettings: () => Promise<void>
  getSetting: (key: string, defaultValue?: string) => string
  setSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loading: false,

  loadSettings: async () => {
    set({ loading: true })
    try {
      const all = await api().settings.getAll()
      set({ settings: all || {}, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  getSetting: (key, defaultValue = '') => {
    return get().settings[key] ?? defaultValue
  },

  setSetting: async (key, value) => {
    await api().settings.set(key, value)
    set((s) => ({ settings: { ...s.settings, [key]: value } }))
  }
}))
