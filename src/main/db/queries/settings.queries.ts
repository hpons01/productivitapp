import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export function getSetting(db: Database.Database, key: string): string | null {
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return result?.value ?? null
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  const now = Date.now()
  const existing = db.prepare('SELECT id FROM settings WHERE key = ?').get(key) as { id: string | null } | undefined

  if (existing) {
    db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(value, now, key)
    return
  }

  db.prepare('INSERT INTO settings (key, value, id, updated_at) VALUES (?, ?, ?, ?)').run(
    key,
    value,
    randomUUID(),
    now
  )
}

export function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}
