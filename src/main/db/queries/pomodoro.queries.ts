import Database from 'better-sqlite3'
import { startOfDay, endOfDay } from 'date-fns'
import { randomUUID } from 'crypto'

export interface PomodoroSession {
  id: string
  task_id: string | null
  label: string | null
  started_at: number
  ended_at: number | null
  duration_mins: number
  break_mins: number
  completed: number
  interruptions: number
  xp_awarded: number
}

export interface PomodoroPreset {
  id: string
  name: string
  work_mins: number
  break_mins: number
  user_created: number
  created_at: number
}

export function startSession(db: Database.Database, data: Omit<PomodoroSession, 'ended_at' | 'completed' | 'interruptions' | 'xp_awarded'>): PomodoroSession {
  db.prepare(`
    INSERT INTO pomodoro_sessions (id, task_id, label, started_at, duration_mins, break_mins, completed)
    VALUES (@id, @task_id, @label, @started_at, @duration_mins, @break_mins, 0)
  `).run(data)
  return db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(data.id) as PomodoroSession
}

export function completeSession(
  db: Database.Database,
  id: string,
  endedAt: number,
  interruptions: number,
  xpAwarded: number
): PomodoroSession {
  db.prepare(`
    UPDATE pomodoro_sessions
    SET ended_at = ?, completed = 1, interruptions = ?, xp_awarded = ?
    WHERE id = ?
  `).run(endedAt, interruptions, xpAwarded, id)
  return db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id) as PomodoroSession
}

export function abandonSession(db: Database.Database, id: string): void {
  db.prepare('UPDATE pomodoro_sessions SET ended_at = ?, completed = 0 WHERE id = ?').run(Date.now(), id)
}

export function listSessions(db: Database.Database, date?: string): PomodoroSession[] {
  if (date) {
    const d = new Date(date)
    const from = startOfDay(d).getTime()
    const to = endOfDay(d).getTime()
    return db
      .prepare('SELECT * FROM pomodoro_sessions WHERE started_at >= ? AND started_at <= ? ORDER BY started_at DESC')
      .all(from, to) as PomodoroSession[]
  }
  return db
    .prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC LIMIT 50')
    .all() as PomodoroSession[]
}

export function getTodayStats(db: Database.Database): {
  totalSessions: number
  completedSessions: number
  totalMinutes: number
} {
  const from = startOfDay(new Date()).getTime()
  const to = endOfDay(new Date()).getTime()

  const result = db.prepare(`
    SELECT
      COUNT(*) as totalSessions,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completedSessions,
      SUM(CASE WHEN completed = 1 THEN duration_mins ELSE 0 END) as totalMinutes
    FROM pomodoro_sessions
    WHERE started_at >= ? AND started_at <= ?
  `).get(from, to) as { totalSessions: number; completedSessions: number; totalMinutes: number }

  return {
    totalSessions: result.totalSessions || 0,
    completedSessions: result.completedSessions || 0,
    totalMinutes: result.totalMinutes || 0
  }
}

export function getTotalCompletedCount(db: Database.Database): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM pomodoro_sessions WHERE completed = 1').get() as { count: number }
  return result.count
}

export function listPresets(db: Database.Database): PomodoroPreset[] {
  return db
    .prepare('SELECT * FROM pomodoro_presets ORDER BY user_created ASC, created_at ASC')
    .all() as PomodoroPreset[]
}

export function createPreset(
  db: Database.Database,
  data: { name?: string; work_mins: number; break_mins: number; user_created?: number }
): PomodoroPreset {
  const existing = db
    .prepare('SELECT * FROM pomodoro_presets WHERE work_mins = ? AND break_mins = ? LIMIT 1')
    .get(data.work_mins, data.break_mins) as PomodoroPreset | undefined

  if (existing) {
    return existing
  }

  const fallbackName = `${data.work_mins} / ${data.break_mins}`
  const preset = {
    id: randomUUID(),
    name: (data.name?.trim() || fallbackName),
    work_mins: data.work_mins,
    break_mins: data.break_mins,
    user_created: data.user_created ?? 1,
    created_at: Date.now()
  }

  db.prepare(`
    INSERT INTO pomodoro_presets (id, name, work_mins, break_mins, user_created, created_at)
    VALUES (@id, @name, @work_mins, @break_mins, @user_created, @created_at)
  `).run(preset)

  return db.prepare('SELECT * FROM pomodoro_presets WHERE id = ?').get(preset.id) as PomodoroPreset
}

export function deletePreset(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM pomodoro_presets WHERE id = ? AND user_created = 1').run(id)
}
