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
      ipcRenderer.invoke('habits:getCompletions', habitId, from, to)
  },

  // Pomodoro
  pomodoro: {
    start: (data: unknown) => ipcRenderer.invoke('pomodoro:start', data),
    complete: (data: unknown) => ipcRenderer.invoke('pomodoro:complete', data),
    abandon: (id: string) => ipcRenderer.invoke('pomodoro:abandon', id),
    list: (date?: string) => ipcRenderer.invoke('pomodoro:list', date),
    todayStats: () => ipcRenderer.invoke('pomodoro:todayStats')
  },

  // Tasks
  tasks: {
    list: () => ipcRenderer.invoke('tasks:list'),
    create: (data: unknown) => ipcRenderer.invoke('tasks:create', data),
    update: (data: unknown) => ipcRenderer.invoke('tasks:update', data),
    complete: (id: string) => ipcRenderer.invoke('tasks:complete', id),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id)
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

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll')
  },

  // Loot inventory
  loot: {
    list: () => ipcRenderer.invoke('loot:list'),
    activate: (id: string) => ipcRenderer.invoke('loot:activate', id)
  },

  // Data export
  export: {
    exportData: (format: 'csv' | 'json') => ipcRenderer.invoke('export:data', format)
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
    return () => ipcRenderer.removeAllListeners('tray:start-pomodoro')
  },
  onTrayOpenHabits: (callback: () => void) => {
    ipcRenderer.on('tray:open-habits', () => callback())
    return () => ipcRenderer.removeAllListeners('tray:open-habits')
  },

  // Update events
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('updater:update-available', () => callback())
    return () => ipcRenderer.removeAllListeners('updater:update-available')
  },
  onUpdateReady: (callback: () => void) => {
    ipcRenderer.on('updater:update-ready', () => callback())
    return () => ipcRenderer.removeAllListeners('updater:update-ready')
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
