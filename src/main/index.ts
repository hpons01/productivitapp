import { config as loadDotenv } from 'dotenv'
import { join, resolve } from 'path'

// Load .env in development — production uses real environment variables
if (process.env.NODE_ENV !== 'production') {
  loadDotenv({ path: resolve(process.cwd(), '.env') })
}

import { app, BrowserWindow, shell, ipcMain, screen } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupTray } from './tray'
import { getDb, initDatabase } from './db'
import { registerAllIpcHandlers } from './ipc'
import { setupAutoUpdater } from './updater'
import { rehydrateTaskReminders, scheduleNotifications } from './notifications'
import { getSetting } from './db/queries/settings.queries'
import { completeOAuthFromCallback, setAuthSessionListener } from './auth/supabase-auth'
import { isNewDevice, runSync, setSyncStatusListener } from './sync'

let mainWindow: BrowserWindow | null = null
const appWithQuitFlag = app as typeof app & { isQuitting?: boolean }

function extractDeepLink(commandLine: string[]): string | null {
  return commandLine.find((arg) => arg.startsWith('productivitapp://')) ?? null
}

async function handleAuthDeepLink(url: string): Promise<void> {
  if (!url.startsWith('productivitapp://auth/callback')) {
    return
  }

  try {
    await completeOAuthFromCallback(url)
    mainWindow?.show()
    mainWindow?.focus()
  } catch (error) {
    console.error('[Auth] Failed to complete OAuth callback', error)
  }
}

function registerProtocolClient(): void {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient('productivitapp', process.execPath, [resolve(process.argv[1])])
    return
  }

  app.setAsDefaultProtocolClient('productivitapp')
}

// Enforce single instance — second launch focuses the existing window instead of creating a new one
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }

  const deepLink = extractDeepLink(commandLine)
  if (deepLink) {
    void handleAuthDeepLink(deepLink)
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  void handleAuthDeepLink(url)
})

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
      nodeIntegration: false,
      backgroundThrottling: false
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
  registerProtocolClient()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  initDatabase()

  // Register IPC handlers
  registerAllIpcHandlers()

  setSyncStatusListener((syncStatus) => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send('sync:statusChanged', syncStatus)
    }
  })

  setAuthSessionListener((session) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth:sessionChanged', session)
    }
    if (session.authenticated) {
      const newDevice = isNewDevice()
      void runSync({ fullPull: newDevice, skipPush: newDevice })
    }
  })

  const db = getDb()
  const startOnBoot = getSetting(db, 'start_on_boot')
  app.setLoginItemSettings({
    openAtLogin: startOnBoot === 'true'
  })

  const win = createWindow()

  const initialDeepLink = extractDeepLink(process.argv)
  if (initialDeepLink) {
    void handleAuthDeepLink(initialDeepLink)
  }

  // Setup system tray
  setupTray(win)

  // Schedule notifications
  scheduleNotifications()
  rehydrateTaskReminders()

  setInterval(() => {
    void runSync()
  }, 5 * 60 * 1000)

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
