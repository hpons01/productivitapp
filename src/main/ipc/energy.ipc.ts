import { ipcMain } from 'electron'
import { getDb } from '../db'
import { logEnergy, getEnergyRange, getLatestEnergy } from '../db/queries/energy.queries'
import { awardXP } from '../db/queries/gamification.queries'

export function registerEnergyIpc(): void {
  ipcMain.handle('energy:log', (_event, data) => {
    const db = getDb()
    const log = logEnergy(db, data)
    const xpAward = awardXP(db, 'energy', log.id, 5)
    return {
      ...log,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier
    }
  })

  ipcMain.handle('energy:getRange', (_event, from: number, to: number) => {
    const db = getDb()
    return getEnergyRange(db, from, to)
  })

  ipcMain.handle('energy:latest', () => {
    const db = getDb()
    return getLatestEnergy(db) || null
  })
}
