import { create } from 'zustand'
import { generateId } from '../lib/utils'
import { habitXP, isLegendaryGrind } from '../lib/science/xp'
import { shouldReward, isStreakMilestone } from '../lib/science/rewards'
import { useGamificationStore } from './gamification.store'
import { startOfDay, endOfDay } from 'date-fns'

const api = () => window.api

function isMissingIpcHandlerError(error: unknown): boolean {
  return error instanceof Error && /No handler registered/i.test(error.message)
}

export interface Habit {
  id: string
  name: string
  description: string | null
  cue: string | null
  obstacle_plan: string | null
  tiny_mode: number
  tiny_started_at: number | null
  tiny_graduated_at: number | null
  category: string
  frequency: string
  custom_days: string | null
  color: string
  icon: string
  created_at: number
  archived_at: number | null
}

export interface HabitWithStreak extends Habit {
  streak: number
  completedToday: boolean
  isLegendary: boolean
}

export interface HabitLapsePrompt {
  brokenStreak: boolean
  alreadyReflected: boolean
  latestReflection: {
    id: string
    reason_code: string
    note: string | null
    suggested_action: string | null
    created_at: number
  } | null
}

interface HabitsState {
  habits: HabitWithStreak[]
  loading: boolean
  lapsePrompt: HabitLapsePrompt | null
  load: () => Promise<void>
  create: (data: Omit<Habit, 'id' | 'created_at' | 'archived_at'>) => Promise<void>
  update: (id: string, data: Partial<Habit>) => Promise<void>
  remove: (id: string) => Promise<void>
  complete: (habitId: string) => Promise<{ xpAwarded: number; streak: number; loot: boolean; shouldSuggestGraduation: boolean }>
  uncomplete: (habitId: string) => Promise<void>
  refreshLapsePrompt: () => Promise<void>
  submitLapseReflection: (reasonCode: string, note?: string) => Promise<void>
  dismissLapsePrompt: () => void
  graduateTinyHabit: (habitId: string) => Promise<void>
  submitMicroCheckin: (habitId: string, difficulty: number, focusEffort: number) => Promise<void>
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  loading: false,
  lapsePrompt: null,

  load: async () => {
    set({ loading: true })
    try {
      const [habitsRaw, _] = await Promise.all([api().habits.list(), Promise.resolve()])
      const today = Date.now()
      const todayStart = startOfDay(new Date()).getTime()
      const todayEnd = endOfDay(new Date()).getTime()

      const habits: HabitWithStreak[] = await Promise.all(
        habitsRaw.map(async (h: Habit) => {
          const streak = await api().habits.getStreak(h.id)
          const completions = await api().habits.getCompletions(h.id, todayStart, todayEnd)
          return {
            ...h,
            streak,
            completedToday: completions.length > 0,
            isLegendary: isLegendaryGrind(streak)
          }
        })
      )

      let lapsePrompt: HabitLapsePrompt | null = null
      try {
        lapsePrompt = await api().habits.lapsePromptStatus()
      } catch (error) {
        if (!isMissingIpcHandlerError(error)) {
          console.error('Failed to load lapse prompt status', error)
        }
      }

      set({ habits, lapsePrompt, loading: false })
    } catch (e) {
      console.error(e)
      set({ loading: false })
    }
  },

  create: async (data) => {
    const habit = await api().habits.create({
      id: generateId(),
      created_at: Date.now(),
      archived_at: null,
      custom_days: data.custom_days ?? null,
      ...data
    })

    const newHabit: HabitWithStreak = {
      ...habit,
      streak: 0,
      completedToday: false,
      isLegendary: false
    }

    set((s) => ({ habits: [...s.habits, newHabit] }))

    // Badge: first habit
    const { checkAndUnlockBadges } = useGamificationStore.getState()
    await checkAndUnlockBadges({
      habitsCount: get().habits.length,
      habitStreak: 0,
      totalPomodoros: 0,
      tasksCompletedToday: 0,
      twoMinTasksTotal: 0,
      morningRitualConsecutive: 0,
      eveningRitualHour: 0,
      journalDaysStreak: 0,
      energyLogDaysStreak: 0,
      bossesDefeated: 0,
      pomodorosBeforeNoon: 0,
      journalWordCount: 0,
      isPerfectDay: false,
      perfectDaysStreak: 0,
      currentHour: new Date().getHours()
    })
  },

  update: async (id, data) => {
    const updated = await api().habits.update({ id, ...data })
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...updated } : h))
    }))
  },

  remove: async (id) => {
    await api().habits.delete(id)
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }))
  },

  complete: async (habitId) => {
    const { checkAndUnlockBadges, triggerLootBox, refreshFromDB } = useGamificationStore.getState()

    const result = await api().habits.complete({
      id: generateId(),
      habit_id: habitId,
      completed_at: Date.now(),
      note: null,
      xp_awarded: 0
    })

    const { xpAwarded, streak } = result
    const habitBefore = get().habits.find((h) => h.id === habitId)
    const shouldSuggestGraduation = Boolean(habitBefore?.tiny_mode === 1 && streak >= 7)

    // Update local state optimistically
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === habitId
          ? { ...h, completedToday: true, streak, isLegendary: isLegendaryGrind(streak) }
          : h
      )
    }))

    await refreshFromDB()

    // Check achievements
    await checkAndUnlockBadges({
      habitsCount: get().habits.length,
      habitStreak: streak,
      totalPomodoros: 0,
      tasksCompletedToday: 0,
      twoMinTasksTotal: 0,
      morningRitualConsecutive: 0,
      eveningRitualHour: 0,
      journalDaysStreak: 0,
      energyLogDaysStreak: 0,
      bossesDefeated: 0,
      pomodorosBeforeNoon: 0,
      journalWordCount: 0,
      isPerfectDay: false,
      perfectDaysStreak: 0,
      currentHour: new Date().getHours()
    })

    // Loot box trigger
    const evolutionTier = useGamificationStore.getState().classEvolutionIndex
    const triggerLoot = shouldReward(
      streak === 1 ? 'first_ever' : isStreakMilestone(streak) ? 'streak_milestone' : 'habit',
      evolutionTier
    )
    if (triggerLoot) {
      triggerLootBox(isStreakMilestone(streak) ? 'streak_milestone' : 'habit')
    }

    return { xpAwarded, streak, loot: triggerLoot, shouldSuggestGraduation }
  },

  uncomplete: async (habitId) => {
    await api().habits.uncomplete({ habitId, date: Date.now() })
    const streak = await api().habits.getStreak(habitId)
    set((s) => ({
      habits: s.habits.map((h) =>
        h.id === habitId
          ? { ...h, completedToday: false, streak, isLegendary: isLegendaryGrind(streak) }
          : h
      )
    }))
    await get().refreshLapsePrompt()
  },

  refreshLapsePrompt: async () => {
    try {
      const lapsePrompt = await api().habits.lapsePromptStatus()
      set({ lapsePrompt })
    } catch (error) {
      if (!isMissingIpcHandlerError(error)) {
        console.error('Failed to refresh lapse prompt', error)
      }
      set({ lapsePrompt: null })
    }
  },

  submitLapseReflection: async (reasonCode, note) => {
    try {
      await api().habits.lapseReflect({
        id: generateId(),
        reasonCode,
        note: note?.trim() ? note.trim() : null
      })
      await get().refreshLapsePrompt()
    } catch (error) {
      if (!isMissingIpcHandlerError(error)) {
        throw error
      }
    }
  },

  dismissLapsePrompt: () => {
    set((s) => {
      if (!s.lapsePrompt) return s
      return {
        lapsePrompt: {
          ...s.lapsePrompt,
          brokenStreak: false
        }
      }
    })
  },

  graduateTinyHabit: async (habitId) => {
    const updated = await api().habits.graduateTiny(habitId)
    set((s) => ({
      habits: s.habits.map((h) => (h.id === habitId ? { ...h, ...updated } : h))
    }))
  },

  submitMicroCheckin: async (habitId, difficulty, focusEffort) => {
    try {
      await api().habits.microCheckin({
        id: generateId(),
        habitId,
        completedAt: Date.now(),
        difficulty,
        focusEffort
      })
    } catch (error) {
      if (!isMissingIpcHandlerError(error)) {
        throw error
      }
    }
  }
}))
