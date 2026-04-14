import Database from 'better-sqlite3'

export interface EventLogEntry {
  id: string
  event_type: string
  source: string
  source_id: string | null
  metadata: string | null
  created_at: number
}

function makeEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function logEvent(
  db: Database.Database,
  eventType: string,
  source: string,
  sourceId: string | null,
  metadata: Record<string, unknown> | null = null
): void {
  const payload = metadata ? JSON.stringify(metadata) : null

  db.prepare(`
    INSERT INTO event_log (id, event_type, source, source_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(makeEventId(), eventType, source, sourceId, payload, Date.now())
}

export function listEvents(db: Database.Database, limit = 200): EventLogEntry[] {
  return db
    .prepare('SELECT * FROM event_log ORDER BY created_at DESC LIMIT ?')
    .all(limit) as EventLogEntry[]
}
