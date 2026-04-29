import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Habits
  habits: {
    list: () => ipcRenderer.invoke('habits:list'),
    create: (data: unknown) => ipcRenderer.invoke('habits:create', data),
    update: (data: unknown) => ipcRenderer.invoke('habits:update', data),
    delete: (id: string) => ipcRenderer.invoke('habits:delete', id),
    complete: (data: unknown) => ipcRenderer.invoke('habits:complete', data),
    uncomplete: (data: unknown) => ipcRenderer.invoke('habits:uncomplete', data),
    getStreak: (id: string) => ipcRenderer.invoke('habits:getStreak', id),
    getCompletions: (habitId: string, from: number, to: number) =>
      ipcRenderer.invoke('habits:getCompletions', habitId, from, to),
    lapsePromptStatus: () => ipcRenderer.invoke('habits:lapsePromptStatus'),
    lapseReflect: (data: unknown) => ipcRenderer.invoke('habits:lapseReflect', data),
    graduateTiny: (habitId: string) => ipcRenderer.invoke('habits:graduateTiny', habitId),
    microCheckin: (data: unknown) => ipcRenderer.invoke('habits:microCheckin', data)
  },

  // Pomodoro
  pomodoro: {
    start: (data: unknown) => ipcRenderer.invoke('pomodoro:start', data),
    complete: (data: unknown) => ipcRenderer.invoke('pomodoro:complete', data),
    abandon: (id: string) => ipcRenderer.invoke('pomodoro:abandon', id),
    list: (date?: string) => ipcRenderer.invoke('pomodoro:list', date),
    todayStats: () => ipcRenderer.invoke('pomodoro:todayStats'),
    loopCompleted: (data: { id: string; endlessMode?: boolean }) => ipcRenderer.invoke('pomodoro:loopCompleted', data),
    lifetimeStats: () => ipcRenderer.invoke('pomodoro:lifetimeStats'),
    listPresets: () => ipcRenderer.invoke('pomodoro:presets:list'),
    createPreset: (data: unknown) => ipcRenderer.invoke('pomodoro:presets:create', data),
    deletePreset: (id: string) => ipcRenderer.invoke('pomodoro:presets:delete', id)
  },

  // Tasks
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (data: unknown) => ipcRenderer.invoke('tasks:create', data),
    update: (data: unknown) => ipcRenderer.invoke('tasks:update', data),
    complete: (id: string) => ipcRenderer.invoke('tasks:complete', id),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    snoozeReminder: (taskId: string, minutes = 5) => ipcRenderer.invoke('tasks:snoozeReminder', taskId, minutes)
  },

  // Journal
  journal: {
    save: (data: unknown) => ipcRenderer.invoke('journal:save', data),
    today: (type: string) => ipcRenderer.invoke('journal:today', type),
    list: (limit?: number) => ipcRenderer.invoke('journal:list', limit)
  },

  // Energy
  energy: {
    log: (data: unknown) => ipcRenderer.invoke('energy:log', data),
    getRange: (from: number, to: number) => ipcRenderer.invoke('energy:getRange', from, to),
    latest: () => ipcRenderer.invoke('energy:latest')
  },

  // Analytics / Gamification
  analytics: {
    dashboard: () => ipcRenderer.invoke('analytics:dashboard'),
    heatmap: (year: number) => ipcRenderer.invoke('analytics:heatmap', year),
    badges: () => ipcRenderer.invoke('analytics:badges'),
    classProgress: () => ipcRenderer.invoke('analytics:classProgress'),
    xpLog: (limit?: number) => ipcRenderer.invoke('analytics:xpLog', limit),
    unlockBadge: (code: string) => ipcRenderer.invoke('analytics:unlockBadge', code),
    classConfig: () => ipcRenderer.invoke('analytics:classConfig'),
    setCharacterClass: (classId: string) => ipcRenderer.invoke('analytics:setCharacterClass', classId),
    addXp: (source: string, sourceId: string, amount: number) =>
      ipcRenderer.invoke('analytics:addXp', source, sourceId, amount)
  },

  // Quests
  quests: {
    list: () => ipcRenderer.invoke('quests:list'),
    enroll: (questId: string) => ipcRenderer.invoke('quests:enroll', questId),
    progress: (questId: string, progress: number) => ipcRenderer.invoke('quests:progress', questId, progress),
    abandon: (questId: string) => ipcRenderer.invoke('quests:abandon', questId),
    history: (limit?: number) => ipcRenderer.invoke('quests:history', limit),
    refresh: () => ipcRenderer.invoke('quests:refresh'),
    catalog: () => ipcRenderer.invoke('quests:catalog'),
    catalogEnroll: (definitionId: string) => ipcRenderer.invoke('quests:catalog:enroll', definitionId),
    catalogAbandon: (enrollmentId: string) => ipcRenderer.invoke('quests:catalog:abandon', enrollmentId),
    catalogProgress: (enrollmentId: string, progress: number) => ipcRenderer.invoke('quests:catalog:progress', enrollmentId, progress),
    reroll: () => ipcRenderer.invoke('quests:reroll')
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    resetOnboarding: () => ipcRenderer.invoke('settings:resetOnboarding')
  },

  // Auth
  auth: {
    signInWithGoogle: () => ipcRenderer.invoke('auth:signInWithGoogle'),
    signInWithEmail: (email: string, password: string) => ipcRenderer.invoke('auth:signInWithEmail', email, password),
    signUpWithEmail: (email: string, password: string) => ipcRenderer.invoke('auth:signUpWithEmail', email, password),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    restoreSession: () => ipcRenderer.invoke('auth:restoreSession'),
    signOut: () => ipcRenderer.invoke('auth:signOut'),
    getProfile: () => ipcRenderer.invoke('auth:getProfile'),
    completeProfile: (displayName: string) => ipcRenderer.invoke('auth:completeProfile', displayName),
    updateProfile: (payload: { displayName?: string | null; avatarUrl?: string | null; email?: string | null }) =>
      ipcRenderer.invoke('auth:updateProfile', payload),
    signOutAllDevices: () => ipcRenderer.invoke('auth:signOutAllDevices'),
    deleteAccount: () => ipcRenderer.invoke('auth:deleteAccount')
  },

  // Loot inventory
  loot: {
    list: () => ipcRenderer.invoke('loot:list'),
    activate: (id: string) => ipcRenderer.invoke('loot:activate', id),
    save: (item: unknown) => ipcRenderer.invoke('loot:save', item),
    claimBossLoot: (item: unknown) => ipcRenderer.invoke('boss:claimLoot', item)
  },

  // Pets
  pets: {
    list: () => ipcRenderer.invoke('pets:list'),
    eggs: () => ipcRenderer.invoke('pets:eggs'),
    equip: (id: string) => ipcRenderer.invoke('pets:equip', id),
    unequip: () => ipcRenderer.invoke('pets:unequip'),
    hatchEgg: (eggId: string) => ipcRenderer.invoke('pets:hatchEgg', eggId),
    rename: (id: string, name: string) => ipcRenderer.invoke('pets:rename', id, name),
    getEquipped: () => ipcRenderer.invoke('pets:getEquipped')
  },

  // Shop / Focus currency
  shop: {
    focusBalance: () => ipcRenderer.invoke('shop:focusBalance'),
    dailyShop: (dateSeed: string) => ipcRenderer.invoke('shop:dailyShop', dateSeed),
    purchase: (itemId: string, dateSeed: string) => ipcRenderer.invoke('shop:purchase', itemId, dateSeed),
    reroll: (dateSeed: string) => ipcRenderer.invoke('shop:reroll', dateSeed),
    focusLog: (limit?: number) => ipcRenderer.invoke('shop:focusLog', limit),
    awardFocus: (source: string, sourceId: string, amount: number) => ipcRenderer.invoke('shop:awardFocus', source, sourceId, amount),
    activateBossBait: () => ipcRenderer.invoke('shop:activateBossBait'),
    activateHabitShield: () => ipcRenderer.invoke('shop:activateHabitShield')
  },

  // Data export
  export: {
    exportData: (format: 'csv' | 'json') => ipcRenderer.invoke('export:data', format),
    importData: (mode: 'replace' | 'merge') => ipcRenderer.invoke('export:importData', mode)
  },

  sync: {
    trigger: () => ipcRenderer.invoke('sync:trigger'),
    getStatus: () => ipcRenderer.invoke('sync:status')
  },

  updater: {
    install: () => ipcRenderer.invoke('updater:install'),
    check: () => ipcRenderer.invoke('updater:check')
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close')
  },

  // Tray events (renderer listens)
  onTrayStartPomodoro: (callback: () => void) => {
    ipcRenderer.on('tray:start-pomodoro', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('tray:start-pomodoro')
    }
  },
  onTrayOpenHabits: (callback: () => void) => {
    ipcRenderer.on('tray:open-habits', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('tray:open-habits')
    }
  },

  // Update events
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('updater:update-available', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('updater:update-available')
    }
  },
  onUpdateReady: (callback: () => void) => {
    ipcRenderer.on('updater:update-ready', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('updater:update-ready')
    }
  },

  // Task reminder events
  onTaskReminder: (callback: (payload: { taskId: string; title: string; dueDate: number }) => void) => {
    const listener = (_event: unknown, payload: { taskId: string; title: string; dueDate: number }) => callback(payload)
    ipcRenderer.on('task:reminder', listener)
    return () => ipcRenderer.off('task:reminder', listener)
  },

  // Quest completion events
  onQuestCompleted: (callback: (payload: { title: string; xpAwarded: number; focusAwarded: number }) => void) => {
    const listener = (_event: unknown, payload: { title: string; xpAwarded: number; focusAwarded: number }) => callback(payload)
    ipcRenderer.on('quest:completed', listener)
    return () => ipcRenderer.off('quest:completed', listener)
  },

  onAuthSessionChanged: (
    callback: (payload: {
      authenticated: boolean
      user: {
        id: string
        email: string | null
        displayName: string | null
        avatarUrl: string | null
        provider: string
      } | null
      expiresAt: number | null
      profileCompleted: boolean
    }) => void
  ) => {
    const listener = (
      _event: unknown,
      payload: {
        authenticated: boolean
        user: {
          id: string
          email: string | null
          displayName: string | null
          avatarUrl: string | null
          provider: string
        } | null
        expiresAt: number | null
        profileCompleted: boolean
      }
    ) => callback(payload)
    ipcRenderer.on('auth:sessionChanged', listener)
    return () => ipcRenderer.off('auth:sessionChanged', listener)
  },

  onSyncStatusChanged: (
    callback: (payload: { inProgress: boolean; lastSyncedAt: number | null; error: string | null }) => void
  ) => {
    const listener = (
      _event: unknown,
      payload: { inProgress: boolean; lastSyncedAt: number | null; error: string | null }
    ) => callback(payload)
    ipcRenderer.on('sync:statusChanged', listener)
    return () => ipcRenderer.off('sync:statusChanged', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
