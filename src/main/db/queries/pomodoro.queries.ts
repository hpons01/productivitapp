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
  endless_mode: number
  loop_completed: number
  completed: number
  interruptions: number
  xp_awarded: number
}

export interface StartPomodoroSessionInput {
  id: string
  task_id: string | null
  label: string | null
  started_at: number
  duration_mins: number
  break_mins: number
  endless_mode?: number
}

export interface PomodoroPreset {
  id: string
  name: string
  work_mins: number
  break_mins: number
  user_created: number
  created_at: number
}

export function startSession(db: Database.Database, data: StartPomodoroSessionInput): PomodoroSession {
  db.prepare(`
    INSERT INTO pomodoro_sessions (id, task_id, label, started_at, duration_mins, break_mins, endless_mode, completed, loop_completed)
    VALUES (@id, @task_id, @label, @started_at, @duration_mins, @break_mins, @endless_mode, 0, 0)
  `).run({
    ...data,
    endless_mode: data.endless_mode ? 1 : 0
  })
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

export function markLoopCompleted(db: Database.Database, id: string, endlessMode: boolean): void {
  db.prepare(`
    UPDATE pomodoro_sessions
    SET loop_completed = 1,
        endless_mode = CASE WHEN ? = 1 THEN 1 ELSE endless_mode END
    WHERE id = ? AND completed = 1
  `).run(endlessMode ? 1 : 0, id)
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

export function getLifetimeStats(db: Database.Database): {
  totalPomodoros: number
  endlessLoopsCompleted: number
} {
  const result = db.prepare(`
    SELECT
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as totalPomodoros,
      SUM(CASE WHEN completed = 1 AND endless_mode = 1 AND loop_completed = 1 THEN 1 ELSE 0 END) as endlessLoopsCompleted
    FROM pomodoro_sessions
  `).get() as {
    totalPomodoros: number | null
    endlessLoopsCompleted: number | null
  }

  return {
    totalPomodoros: result.totalPomodoros || 0,
    endlessLoopsCompleted: result.endlessLoopsCompleted || 0
  }
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
