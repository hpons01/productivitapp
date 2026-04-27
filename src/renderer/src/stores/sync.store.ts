import { create } from 'zustand'
import { useEnergyStore } from './energy.store'
import { useGamificationStore } from './gamification.store'
import { useHabitsStore } from './habits.store'
import { useJournalStore } from './journal.store'
import { usePetsStore } from './pets.store'
import { usePomodoroStore } from './pomodoro.store'
import { useSettingsStore } from './settings.store'
import { useShopStore } from './shop.store'
import { useTasksStore } from './tasks.store'

interface SyncStatus {
  inProgress: boolean
  lastSyncedAt: number | null
  error: string | null
}

interface SyncState extends SyncStatus {
  initialized: boolean
  triggerSync: () => Promise<void>
  initSyncListener: () => Promise<() => void>
}

async function reloadAllStores(): Promise<void> {
  await Promise.allSettled([
    useHabitsStore.getState().load(),
    useTasksStore.getState().load(),
    useJournalStore.getState().loadToday(),
    useEnergyStore.getState().loadRange(),
    useSettingsStore.getState().loadSettings(),
    usePetsStore.getState().load(),
    useShopStore.getState().load(),
    usePomodoroStore.getState().loadTodayStats(),
    usePomodoroStore.getState().loadPresets(),
    useGamificationStore.getState().refreshFromDB(),
    useGamificationStore.getState().loadCharacterClassConfig()
  ])
}

export const useSyncStore = create<SyncState>((set, get) => ({
  inProgress: false,
  lastSyncedAt: null,
  error: null,
  initialized: false,

  triggerSync: async () => {
    await window.api.sync.trigger()
  },

  initSyncListener: async () => {
    const status = await window.api.sync.getStatus() as SyncStatus
    set({ ...status, initialized: true })

    let previous = status

    const unsubscribe = window.api.onSyncStatusChanged(async (next) => {
      set(next)

      const justCompleted = previous.inProgress && !next.inProgress && !next.error
      previous = next

      if (justCompleted) {
        await reloadAllStores()
      }
    })

    return unsubscribe
  }
}))
