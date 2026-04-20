import { create } from 'zustand'
import { generateId } from '../lib/utils'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

export type TimerStatus = 'idle' | 'running' | 'paused' | 'break' | 'completed'

export interface PomodoroPreset {
  id: string
  name: string
  work_mins: number
  break_mins: number
  user_created: number
  created_at: number
}

interface PomodoroState {
  status: TimerStatus
  timeLeft: number // seconds
  lastTickAt: number | null
  duration: number // minutes
  breakDuration: number // minutes
  runDuration: number // minutes
  runBreakDuration: number // minutes
  repetitionTarget: number
  endlessMode: boolean
  loopsCompletedInRun: number
  currentSessionId: string | null
  lastCompletedSessionId: string | null
  sessionLabel: string
  runLabel: string
  interruptions: number
  pendingBreakTimeoutId: ReturnType<typeof setTimeout> | null
  todayPomodoros: number
  todayMinutes: number
  presets: PomodoroPreset[]

  start: (label?: string, durationMins?: number, options?: { continueRun?: boolean }) => Promise<void>
  pause: () => void
  resume: () => void
  tick: () => void
  complete: () => Promise<void>
  stop: () => Promise<void>
  abandon: () => Promise<void>
  startBreak: () => void
  endBreak: () => Promise<void>
  setLabel: (label: string) => void
  setRepetitionTarget: (value: number) => void
  toggleEndlessMode: () => void
  increment: () => void
  loadTodayStats: () => Promise<void>
  loadPresets: () => Promise<void>
  createPreset: (workMins: number, breakMins: number) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  applyPreset: (workMins: number, breakMins: number) => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  status: 'idle',
  timeLeft: 25 * 60,
  lastTickAt: null,
  duration: 25,
  breakDuration: 5,
  runDuration: 25,
  runBreakDuration: 5,
  repetitionTarget: 1,
  endlessMode: false,
  loopsCompletedInRun: 0,
  currentSessionId: null,
  lastCompletedSessionId: null,
  sessionLabel: '',
  runLabel: '',
  interruptions: 0,
  pendingBreakTimeoutId: null,
  todayPomodoros: 0,
  todayMinutes: 0,
  presets: [],

  start: async (label = '', durationMins?: number, options?: { continueRun?: boolean }) => {
    const continueRun = options?.continueRun === true
    const state = get()
    const duration = durationMins ?? (continueRun ? state.runDuration : state.duration)
    const breakDuration = continueRun ? state.runBreakDuration : state.breakDuration
    const sessionId = generateId()

    if (state.pendingBreakTimeoutId) {
      clearTimeout(state.pendingBreakTimeoutId)
    }

    await api().pomodoro.start({
      id: sessionId,
      label,
      task_id: null,
      started_at: Date.now(),
      duration_mins: duration,
      break_mins: breakDuration,
      endless_mode: state.endlessMode ? 1 : 0
    })

    set({
      status: 'running',
      timeLeft: duration * 60,
      lastTickAt: Date.now(),
      currentSessionId: sessionId,
      lastCompletedSessionId: null,
      sessionLabel: label,
      runLabel: continueRun ? state.runLabel : label,
      interruptions: 0,
      duration,
      breakDuration,
      runDuration: continueRun ? state.runDuration : duration,
      runBreakDuration: continueRun ? state.runBreakDuration : breakDuration,
      loopsCompletedInRun: continueRun ? state.loopsCompletedInRun : 0,
      pendingBreakTimeoutId: null
    })
  },

  pause: () => {
    if (get().status !== 'running') return
    set((s) => ({
      status: 'paused',
      lastTickAt: null,
      interruptions: s.interruptions + 1
    }))
  },

  resume: () => {
    if (get().status !== 'paused') return
    set({ status: 'running', lastTickAt: Date.now() })
  },

  tick: () => {
    const { status, timeLeft, lastTickAt } = get()
    if (status !== 'running' && status !== 'break') return

    const now = Date.now()
    const baseline = lastTickAt ?? now
    const elapsedSeconds = Math.floor((now - baseline) / 1000)

    if (elapsedSeconds <= 0) return

    if (timeLeft <= elapsedSeconds) {
      set({ timeLeft: 0, lastTickAt: now })
      if (status === 'running') {
        void get().complete().catch((error) => {
          console.error('Pomodoro completion failed from tick', error)
        })
      } else {
        void get().endBreak().catch((error) => {
          console.error('Pomodoro break end failed from tick', error)
        })
      }
      return
    }

    set({
      timeLeft: timeLeft - elapsedSeconds,
      lastTickAt: baseline + elapsedSeconds * 1000
    })
  },

  complete: async () => {
    const { currentSessionId, interruptions } = get()
    if (!currentSessionId) return

    await api().pomodoro.complete({ id: currentSessionId, interruptions })

    set({
      status: 'completed',
      timeLeft: 0,
      lastTickAt: null,
      currentSessionId: null,
      lastCompletedSessionId: currentSessionId
    })

    try {
      const { refreshFromDB, triggerLootBox, checkAndUnlockBadges } = useGamificationStore.getState()
      await refreshFromDB()

      void triggerLootBox('pomodoro')

      const lifetimeStats = await api().pomodoro.lifetimeStats()

      await checkAndUnlockBadges({
        habitsCount: 0,
        habitStreak: 0,
        totalPomodoros: Number(lifetimeStats.totalPomodoros || 0),
        endlessLoopsCompleted: Number(lifetimeStats.endlessLoopsCompleted || 0),
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
    } catch (error) {
      console.error('Pomodoro post-completion side effects failed', error)
    } finally {
      await get().loadTodayStats()
      // Auto-start break after a moment, even if reward side effects fail.
      const timeoutId = setTimeout(() => {
        if (get().status === 'completed') {
          get().startBreak()
        }
      }, 1500)
      set({ pendingBreakTimeoutId: timeoutId })
    }
  },

  stop: async () => {
    const { status, currentSessionId, pendingBreakTimeoutId, duration } = get()

    if (pendingBreakTimeoutId) {
      clearTimeout(pendingBreakTimeoutId)
    }

    if ((status === 'running' || status === 'paused') && currentSessionId) {
      await api().pomodoro.abandon(currentSessionId)
    }

    set({
      status: 'idle',
      timeLeft: duration * 60,
      lastTickAt: null,
      currentSessionId: null,
      lastCompletedSessionId: null,
      interruptions: 0,
      loopsCompletedInRun: 0,
      pendingBreakTimeoutId: null
    })
  },

  abandon: async () => get().stop(),

  startBreak: () => {
    set((s) => ({
      status: 'break',
      timeLeft: s.runBreakDuration * 60,
      lastTickAt: Date.now(),
      pendingBreakTimeoutId: null
    }))
  },

  endBreak: async () => {
    const {
      lastCompletedSessionId,
      loopsCompletedInRun,
      repetitionTarget,
      endlessMode,
      runLabel,
      runDuration,
      runBreakDuration
    } = get()

    if (lastCompletedSessionId) {
      await api().pomodoro.loopCompleted({ id: lastCompletedSessionId, endlessMode })
    }

    const completedLoops = lastCompletedSessionId ? loopsCompletedInRun + 1 : loopsCompletedInRun
    const shouldContinue = endlessMode || completedLoops < repetitionTarget

    if (shouldContinue) {
      set({
        loopsCompletedInRun: completedLoops,
        lastCompletedSessionId: null,
        status: 'idle',
        timeLeft: runDuration * 60,
        lastTickAt: null,
        currentSessionId: null,
        interruptions: 0,
        duration: runDuration,
        breakDuration: runBreakDuration
      })
      await get().start(runLabel, runDuration, { continueRun: true })
      return
    }

    set((s) => ({
      status: 'idle',
      timeLeft: s.duration * 60,
      lastTickAt: null,
      currentSessionId: null,
      lastCompletedSessionId: null,
      interruptions: 0,
      loopsCompletedInRun: completedLoops
    }))
  },

  setLabel: (label) => set({ sessionLabel: label }),

  setRepetitionTarget: (value) => {
    const safe = Math.max(1, Math.min(99, Number.isFinite(value) ? Math.floor(value) : 1))
    set({ repetitionTarget: safe })
  },

  toggleEndlessMode: () => set((s) => ({ endlessMode: !s.endlessMode })),

  increment: () => set((s) => ({ interruptions: s.interruptions + 1 })),

  loadTodayStats: async () => {
    try {
      const stats = await api().pomodoro.todayStats()
      set({
        todayPomodoros: stats.completedSessions,
        todayMinutes: stats.totalMinutes
      })
    } catch {}
  },

  loadPresets: async () => {
    try {
      const presets = await api().pomodoro.listPresets()
      set({ presets: presets as PomodoroPreset[] })
    } catch {}
  },

  createPreset: async (workMins, breakMins) => {
    const preset = await api().pomodoro.createPreset({
      work_mins: workMins,
      break_mins: breakMins
    })

    set((s) => {
      const next = preset as PomodoroPreset
      const byId = s.presets.find((p) => p.id === next.id)
      const byDuration = s.presets.find(
        (p) => p.work_mins === next.work_mins && p.break_mins === next.break_mins
      )

      if (byId || byDuration) {
        return {
          presets: s.presets.map((p) => (p.id === next.id ? next : p))
        }
      }

      return {
        presets: [...s.presets, next]
      }
    })
  },

  deletePreset: async (id) => {
    await api().pomodoro.deletePreset(id)
    set((s) => ({ presets: s.presets.filter((preset) => preset.id !== id) }))
  },

  applyPreset: (workMins, breakMins) => {
    set({
      duration: workMins,
      breakDuration: breakMins,
      runDuration: workMins,
      runBreakDuration: breakMins,
      timeLeft: workMins * 60,
      lastTickAt: null
    })
  }
}))
