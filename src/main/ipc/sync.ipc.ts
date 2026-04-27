import { ipcMain } from 'electron'
import { getSyncStatus, runSync } from '../sync'

export function registerSyncIpc(): void {
  ipcMain.handle('sync:trigger', () => {
    void runSync()
    return { queued: true }
  })

  ipcMain.handle('sync:status', () => {
    return getSyncStatus()
  })
}
