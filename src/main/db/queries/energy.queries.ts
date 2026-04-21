import Database from 'better-sqlite3'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export interface EnergyLog {
  id: string
  logged_at: number
  energy: number
  mood: number
  note: string | null
  context: string
}

export function logEnergy(db: Database.Database, data: EnergyLog): EnergyLog {
  db.prepare(`
    INSERT INTO energy_logs (id, logged_at, energy, mood, note, context, updated_at)
    VALUES (@id, @logged_at, @energy, @mood, @note, @context, @updated_at)
  `).run({ ...data, updated_at: Date.now() })
  return db.prepare('SELECT * FROM energy_logs WHERE id = ?').get(data.id) as EnergyLog
}

export function getEnergyRange(db: Database.Database, from: number, to: number): EnergyLog[] {
  return db
    .prepare('SELECT * FROM energy_logs WHERE logged_at >= ? AND logged_at <= ? AND deleted_at IS NULL ORDER BY logged_at ASC')
    .all(from, to) as EnergyLog[]
}

export function getLatestEnergy(db: Database.Database): EnergyLog | undefined {
  return db
    .prepare('SELECT * FROM energy_logs WHERE deleted_at IS NULL ORDER BY logged_at DESC LIMIT 1')
    .get() as EnergyLog | undefined
}

export function getAverageEnergyLast7Days(db: Database.Database): number {
  const from = startOfDay(subDays(new Date(), 6)).getTime()
  const result = db
    .prepare('SELECT AVG(energy) as avg FROM energy_logs WHERE logged_at >= ? AND deleted_at IS NULL')
    .get(from) as { avg: number | null }
  return result.avg ? Math.round(result.avg * 10) / 10 : 0
}

export function getEnergyStreakDays(db: Database.Database): number {
  // Count consecutive days with at least one energy log
  let streak = 0
  let checkDate = new Date()

  for (let i = 0; i < 60; i++) {
    const from = startOfDay(checkDate).getTime()
    const to = endOfDay(checkDate).getTime()
    const result = db
      .prepare('SELECT COUNT(*) as count FROM energy_logs WHERE logged_at >= ? AND logged_at <= ? AND deleted_at IS NULL')
      .get(from, to) as { count: number }

    if (result.count > 0) {
      streak++
      checkDate = subDays(checkDate, 1)
    } else {
      break
    }
  }

  return streak
}
