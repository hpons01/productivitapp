import { ipcMain } from 'electron'
import { getDb } from '../db'
import { getSetting, setSetting, getAllSettings } from '../db/queries/settings.queries'
import { scheduleNotifications } from '../notifications'

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_event, key: string) => {
    const db = getDb()
    return getSetting(db, key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    const db = getDb()
    setSetting(db, key, value)

    // Re-schedule notifications if notification settings changed
    if (key.startsWith('notification_')) {
      scheduleNotifications()
    }

    return { success: true }
  })

  ipcMain.handle('settings:getAll', () => {
    const db = getDb()
    return getAllSettings(db)
  })
}
