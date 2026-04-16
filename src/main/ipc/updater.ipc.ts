import { ipcMain } from 'electron'
import { checkForUpdates, installUpdate } from '../updater'

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:install', () => {
    installUpdate()
    return { success: true }
  })

  ipcMain.handle('updater:check', async () => {
    await checkForUpdates()
    return { success: true }
  })
}
