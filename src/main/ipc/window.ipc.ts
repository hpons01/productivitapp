import { BrowserWindow, ipcMain } from 'electron'

export function registerWindowIpc(): void {
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
    return { success: true }
  })

  ipcMain.handle('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false, isMaximized: false }

    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }

    return { success: true, isMaximized: win.isMaximized() }
  })

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return Boolean(win?.isMaximized())
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
    return { success: true }
  })
}
