import { app, BrowserWindow, shell, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupTray } from './tray'
import { getDb, initDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import { setupAutoUpdater } from './updater'
import { rehydrateTaskReminders, scheduleNotifications } from './notifications'
import { getSetting } from './db/queries/settings.queries'

let mainWindow: BrowserWindow | null = null
const appWithQuitFlag = app as typeof app & { isQuitting?: boolean }

function createWindow(): BrowserWindow {
  const { width: workAreaWidth, height: workAreaHeight } = screen.getPrimaryDisplay().workAreaSize
  const launchWidth = Math.max(900, Math.round(workAreaWidth * 0.80))
  const launchHeight = Math.max(600, Math.round(workAreaHeight * 0.80))

  mainWindow = new BrowserWindow({
    width: launchWidth,
    height: launchHeight,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: process.platform === 'win32' ? false : true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f1a',
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!appWithQuitFlag.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.productivitapp.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  initDatabase()

  // Register IPC handlers
  registerAllIpcHandlers()

  const db = getDb()
  const startOnBoot = getSetting(db, 'start_on_boot')
  app.setLoginItemSettings({
    openAtLogin: startOnBoot === 'true'
  })

  const win = createWindow()

  // Setup system tray
  setupTray(win)

  // Schedule notifications
  scheduleNotifications()
  rehydrateTaskReminders()

  // Setup auto-updater (only in production)
  if (!is.dev) {
    setupAutoUpdater(win)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  appWithQuitFlag.isQuitting = true
})

// Expose mainWindow getter for IPC handlers that need to send to renderer
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
