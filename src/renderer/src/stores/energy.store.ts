import { create } from 'zustand'
import { generateId } from '../lib/utils'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

export interface EnergyLog {
  id: string
  logged_at: number
  energy: number
  mood: number
  note: string | null
  context: string
}

interface EnergyState {
  logs: EnergyLog[]
  latest: EnergyLog | null
  loading: boolean
  loadRange: (days?: number) => Promise<void>
  logEnergy: (energy: number, mood: number, note?: string) => Promise<void>
}

export const useEnergyStore = create<EnergyState>((set, get) => ({
  logs: [],
  latest: null,
  loading: false,

  loadRange: async (days = 14) => {
    set({ loading: true })
    try {
      const from = Date.now() - days * 24 * 60 * 60 * 1000
      const [logs, latest] = await Promise.all([
        api().energy.getRange(from, Date.now()),
        api().energy.latest()
      ])
      set({ logs: logs || [], latest: latest || null, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  logEnergy: async (energy, mood, note = '') => {
    const log = await api().energy.log({
      id: generateId(),
      logged_at: Date.now(),
      energy,
      mood,
      note,
      context: 'work'
    })

    set((s) => ({ logs: [...s.logs, log], latest: log }))

    const { refreshFromDB } = useGamificationStore.getState()
    await refreshFromDB()
  }
}))
