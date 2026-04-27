import Database from 'better-sqlite3'
import { startOfDay, endOfDay } from 'date-fns'

export interface JournalEntry {
  id: string
  type: string
  date: number
  intentions: string | null
  wins: string | null
  gratitude: string | null
  energy_level: number | null
  mood_emoji: string | null
  reflection: string | null
  tomorrow_prep: string | null
  created_at: number
}

type JournalEntryInput =
  Pick<JournalEntry, 'id' | 'type' | 'date' | 'created_at'> &
  Partial<Omit<JournalEntry, 'id' | 'type' | 'date' | 'created_at'>>

export function saveJournalEntry(db: Database.Database, data: JournalEntryInput): JournalEntry {
  const payload: JournalEntry = {
    id: data.id,
    type: data.type,
    date: data.date,
    intentions: data.intentions ?? null,
    wins: data.wins ?? null,
    gratitude: data.gratitude ?? null,
    energy_level: data.energy_level ?? null,
    mood_emoji: data.mood_emoji ?? null,
    reflection: data.reflection ?? null,
    tomorrow_prep: data.tomorrow_prep ?? null,
    created_at: data.created_at
  }

  db.prepare(`
    INSERT OR REPLACE INTO journal_entries
    (id, type, date, intentions, wins, gratitude, energy_level, mood_emoji, reflection, tomorrow_prep, created_at, updated_at)
    VALUES (@id, @type, @date, @intentions, @wins, @gratitude, @energy_level, @mood_emoji, @reflection, @tomorrow_prep, @created_at, @updated_at)
  `).run({ ...payload, updated_at: Date.now() })
  return db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(data.id) as JournalEntry
}

export function getTodayEntry(db: Database.Database, type: string): JournalEntry | undefined {
  const from = startOfDay(new Date()).getTime()
  const to = endOfDay(new Date()).getTime()
  return db
    .prepare('SELECT * FROM journal_entries WHERE type = ? AND date >= ? AND date <= ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1')
    .get(type, from, to) as JournalEntry | undefined
}

export function listEntries(db: Database.Database, limit = 30): JournalEntry[] {
  return db
    .prepare('SELECT * FROM journal_entries WHERE deleted_at IS NULL ORDER BY date DESC LIMIT ?')
    .all(limit) as JournalEntry[]
}

export function getConsecutiveMorningDays(db: Database.Database): number {
  const entries = db
    .prepare("SELECT date FROM journal_entries WHERE type = 'morning' AND deleted_at IS NULL ORDER BY date DESC")
    .all() as Array<{ date: number }>

  if (!entries.length) return 0

  let streak = 0
  let checkDay = startOfDay(new Date())

  for (const entry of entries) {
    const entryDay = startOfDay(new Date(entry.date))
    const diff = Math.round(
      (checkDay.getTime() - entryDay.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diff === 0) {
      streak++
      checkDay = new Date(checkDay.getTime() - 24 * 60 * 60 * 1000)
    } else if (diff === 1) {
      // Skip today if not yet done
      checkDay = new Date(checkDay.getTime() - 24 * 60 * 60 * 1000)
      if (entryDay.getTime() === checkDay.getTime()) {
        streak++
        checkDay = new Date(checkDay.getTime() - 24 * 60 * 60 * 1000)
      } else {
        break
      }
    } else {
      break
    }
  }

  return streak
}
