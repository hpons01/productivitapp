import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('updater:update-available')
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updater:update-ready')
  })

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err)
  })

  // Check after 3 seconds to not block startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail if no network
    })
  }, 3000)
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
