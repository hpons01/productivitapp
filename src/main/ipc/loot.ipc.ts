import { ipcMain } from 'electron'
import { getDb } from '../db'

export interface LootItem {
  id: string
  type: string
  tier: string
  payload: string
  earned_at: number
  used_at: number | null
}

export function registerLootIpc(): void {
  ipcMain.handle('loot:list', () => {
    const db = getDb()
    return db
      .prepare('SELECT * FROM loot_inventory ORDER BY earned_at DESC')
      .all() as LootItem[]
  })

  ipcMain.handle('loot:activate', (_event, id: string) => {
    const db = getDb()
    db.prepare('UPDATE loot_inventory SET used_at = ? WHERE id = ?').run(Date.now(), id)
    return { success: true }
  })
}
