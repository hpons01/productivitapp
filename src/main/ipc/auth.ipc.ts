import { ipcMain } from 'electron'
import {
  beginGoogleOAuth,
  completeProfile,
  deleteAccount,
  getCurrentSession,
  getProfile,
  restoreSession,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  signOutAllDevices,
  updateProfile
} from '../auth/supabase-auth'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:signInWithGoogle', async () => {
    await beginGoogleOAuth()
    return { success: true }
  })

  ipcMain.handle('auth:signInWithEmail', async (_event, email: string, password: string) => {
    return signInWithEmail(email, password)
  })

  ipcMain.handle('auth:signUpWithEmail', async (_event, email: string, password: string) => {
    return signUpWithEmail(email, password)
  })

  ipcMain.handle('auth:getSession', async () => {
    return getCurrentSession()
  })

  ipcMain.handle('auth:restoreSession', async () => {
    return restoreSession()
  })

  ipcMain.handle('auth:signOut', async () => {
    await signOut()
    return { success: true }
  })

  ipcMain.handle('auth:getProfile', async () => {
    return getProfile()
  })

  ipcMain.handle('auth:completeProfile', async (_event, displayName: string) => {
    return completeProfile(displayName)
  })

  ipcMain.handle('auth:updateProfile', async (_event, payload: { displayName?: string | null; avatarUrl?: string | null; email?: string | null }) => {
    return updateProfile(payload)
  })

  ipcMain.handle('auth:signOutAllDevices', async () => {
    await signOutAllDevices()
    return { success: true }
  })

  ipcMain.handle('auth:deleteAccount', async () => {
    await deleteAccount()
    return { success: true }
  })
}
