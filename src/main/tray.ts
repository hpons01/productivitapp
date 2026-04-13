import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../resources/tray-icon.png')

  try {
    const icon = nativeImage.createFromPath(iconPath)
    tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  } catch {
    tray = new Tray(nativeImage.createEmpty())
  }

  tray.setToolTip('ProductivitApp')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: '▶ Start Pomodoro',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('tray:start-pomodoro')
      }
    },
    {
      label: '✅ Quick Habit Check-in',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('tray:open-habits')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        ;(app as NodeJS.EventEmitter & { isQuitting?: boolean }).isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })
}

export function updateTrayTitle(title: string): void {
  if (tray && process.platform === 'darwin') {
    tray.setTitle(title)
  }
}
