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

interface IntentionPlan {
  action: string
  time?: string
  location?: string
}

interface JournalState {
  todayMorning: JournalEntry | null
  todayEvening: JournalEntry | null
  entries: JournalEntry[]
  loading: boolean
  loadToday: () => Promise<void>
  saveMorning: (data: Partial<JournalEntry>, intentions?: IntentionPlan[]) => Promise<JournalEntry>
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

  saveMorning: async (data, intentions = []) => {
    const entry = await api().journal.save({
      id: generateId(),
      type: 'morning',
      date: Date.now(),
      created_at: Date.now(),
      ...data
    })
    set({ todayMorning: entry })

    const normalizedIntentions = intentions
      .map((item) => ({
        action: item.action.trim(),
        time: (item.time || '').trim(),
        location: (item.location || '').trim()
      }))
      .filter((item) => item.action)

    const normalizedActions = Array.from(
      new Set(
        normalizedIntentions
          .map((item) => item.action)
          .filter(Boolean)
      )
    )

    if (normalizedActions.length > 0) {
      const existingTasks = await api().tasks.list() as Array<{ title: string }>
      const existingTitles = new Set(existingTasks.map((task) => task.title.trim().toLowerCase()))

      const actionsToCreate = normalizedActions.filter(
        (action) => !existingTitles.has(action.toLowerCase())
      )

      await Promise.all(actionsToCreate.map((action) => {
        const matched = normalizedIntentions.find((item) => item.action.toLowerCase() === action.toLowerCase())
        const dueDate = (() => {
          if (!matched?.time || !/^\d{2}:\d{2}$/.test(matched.time)) return null
          const [hours, minutes] = matched.time.split(':').map(Number)
          const date = new Date()
          date.setHours(hours, minutes, 0, 0)
          return date.getTime()
        })()

        return api().tasks.create({
          id: generateId(),
          title: action,
          notes: 'Created from morning intention',
          priority: 2,
          estimated_mins: null,
          due_date: dueDate,
          completed_at: null,
          created_at: Date.now(),
          habit_id: null,
          temptation_bundle: null
        })
      }))
    }

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
