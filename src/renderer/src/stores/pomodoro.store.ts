import { create } from 'zustand'
import { generateId } from '../lib/utils'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

export type TimerStatus = 'idle' | 'running' | 'paused' | 'break' | 'completed'

interface PomodoroState {
  status: TimerStatus
  timeLeft: number // seconds
  duration: number // minutes
  breakDuration: number // minutes
  currentSessionId: string | null
  sessionLabel: string
  interruptions: number
  todayPomodoros: number
  todayMinutes: number

  start: (label?: string, durationMins?: number) => Promise<void>
  pause: () => void
  resume: () => void
  tick: () => void
  complete: () => Promise<void>
  abandon: () => Promise<void>
  startBreak: () => void
  endBreak: () => void
  setLabel: (label: string) => void
  increment: () => void
  loadTodayStats: () => Promise<void>
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  status: 'idle',
  timeLeft: 25 * 60,
  duration: 25,
  breakDuration: 5,
  currentSessionId: null,
  sessionLabel: '',
  interruptions: 0,
  todayPomodoros: 0,
  todayMinutes: 0,

  start: async (label = '', durationMins?: number) => {
    const duration = durationMins ?? get().duration
    const sessionId = generateId()

    await api().pomodoro.start({
      id: sessionId,
      label,
      task_id: null,
      started_at: Date.now(),
      duration_mins: duration,
      break_mins: get().breakDuration
    })

    set({
      status: 'running',
      timeLeft: duration * 60,
      currentSessionId: sessionId,
      sessionLabel: label,
      interruptions: 0,
      duration
    })
  },

  pause: () => {
    set((s) => ({
      status: 'paused',
      interruptions: s.interruptions + 1
    }))
  },

  resume: () => set({ status: 'running' }),

  tick: () => {
    const { status, timeLeft } = get()
    if (status !== 'running') return

    if (timeLeft <= 1) {
      get().complete()
    } else {
      set({ timeLeft: timeLeft - 1 })
    }
  },

  complete: async () => {
    const { currentSessionId, interruptions } = get()
    if (!currentSessionId) return

    const result = await api().pomodoro.complete({ id: currentSessionId, interruptions })

    set({ status: 'completed', timeLeft: 0 })

    const { refreshFromDB, triggerLootBox, checkAndUnlockBadges } = useGamificationStore.getState()
    await refreshFromDB()

    triggerLootBox('pomodoro')

    await checkAndUnlockBadges({
      habitsCount: 0,
      habitStreak: 0,
      totalPomodoros: (get().todayPomodoros || 0) + 1,
      tasksCompletedToday: 0,
      twoMinTasksTotal: 0,
      morningRitualConsecutive: 0,
      eveningRitualHour: 0,
      journalDaysStreak: 0,
      energyLogDaysStreak: 0,
      bossesDefeated: 0,
      pomodorosBeforeNoon: new Date().getHours() < 12 ? (get().todayPomodoros || 0) + 1 : 0,
      journalWordCount: 0,
      isPerfectDay: false,
      perfectDaysStreak: 0,
      currentHour: new Date().getHours()
    })

    await get().loadTodayStats()

    // Auto-start break after a moment
    setTimeout(() => get().startBreak(), 1500)
  },

  abandon: async () => {
    const { currentSessionId } = get()
    if (currentSessionId) {
      await api().pomodoro.abandon(currentSessionId)
    }
    set({ status: 'idle', timeLeft: get().duration * 60, currentSessionId: null })
  },

  startBreak: () => {
    set((s) => ({ status: 'break', timeLeft: s.breakDuration * 60 }))
  },

  endBreak: () => {
    set((s) => ({ status: 'idle', timeLeft: s.duration * 60, currentSessionId: null }))
  },

  setLabel: (label) => set({ sessionLabel: label }),

  increment: () => set((s) => ({ interruptions: s.interruptions + 1 })),

  loadTodayStats: async () => {
    try {
      const stats = await api().pomodoro.todayStats()
      set({
        todayPomodoros: stats.completedSessions,
        todayMinutes: stats.totalMinutes
      })
    } catch {}
  }
}))
