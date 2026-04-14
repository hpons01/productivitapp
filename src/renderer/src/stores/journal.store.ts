import { create } from 'zustand'
import { generateId } from '../lib/utils'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

export interface JournalEntry {
  id: string
  type: string
  date: number
  intentions: string | null
  wins: string | null
  gratitude: string | null
  energy_level: number | null
  mood_emoji: string | null
  reflection: string | null
  tomorrow_prep: string | null
  created_at: number
}

interface JournalState {
  todayMorning: JournalEntry | null
  todayEvening: JournalEntry | null
  entries: JournalEntry[]
  loading: boolean
  loadToday: () => Promise<void>
  saveMorning: (data: Partial<JournalEntry>) => Promise<JournalEntry>
  saveEvening: (data: Partial<JournalEntry>) => Promise<JournalEntry>
}

export const useJournalStore = create<JournalState>((set, get) => ({
  todayMorning: null,
  todayEvening: null,
  entries: [],
  loading: false,

  loadToday: async () => {
    set({ loading: true })
    try {
      const [morning, evening] = await Promise.all([
        api().journal.today('morning'),
        api().journal.today('evening')
      ])
      set({ todayMorning: morning, todayEvening: evening, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  saveMorning: async (data) => {
    const entry = await api().journal.save({
      id: generateId(),
      type: 'morning',
      date: Date.now(),
      created_at: Date.now(),
      ...data
    })
    set({ todayMorning: entry })

    const { refreshFromDB, checkAndUnlockBadges } = useGamificationStore.getState()
    await refreshFromDB()
    await checkAndUnlockBadges({
      habitsCount: 0,
      habitStreak: 0,
      totalPomodoros: 0,
      tasksCompletedToday: 0,
      twoMinTasksTotal: 0,
      morningRitualConsecutive: 1,
      eveningRitualHour: 0,
      journalDaysStreak: 1,
      energyLogDaysStreak: 0,
      bossesDefeated: 0,
      pomodorosBeforeNoon: 0,
      journalWordCount: (data.reflection || '').split(' ').length,
      isPerfectDay: false,
      perfectDaysStreak: 0,
      currentHour: new Date().getHours()
    })

    return entry
  },

  saveEvening: async (data) => {
    const entry = await api().journal.save({
      id: generateId(),
      type: 'evening',
      date: Date.now(),
      created_at: Date.now(),
      ...data
    })
    set({ todayEvening: entry })

    const { refreshFromDB, checkAndUnlockBadges } = useGamificationStore.getState()
    await refreshFromDB()
    await checkAndUnlockBadges({
      habitsCount: 0,
      habitStreak: 0,
      totalPomodoros: 0,
      tasksCompletedToday: 0,
      twoMinTasksTotal: 0,
      morningRitualConsecutive: 0,
      eveningRitualHour: new Date().getHours(),
      journalDaysStreak: 1,
      energyLogDaysStreak: 0,
      bossesDefeated: 0,
      pomodorosBeforeNoon: 0,
      journalWordCount: (data.reflection || '').split(' ').length,
      isPerfectDay: false,
      perfectDaysStreak: 0,
      currentHour: new Date().getHours()
    })

    return entry
  }
}))
