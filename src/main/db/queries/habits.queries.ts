import Database from 'better-sqlite3'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export interface Habit {
  id: string
  name: string
  description: string | null
  cue: string | null
  obstacle_plan: string | null
  tiny_mode: number
  tiny_started_at: number | null
  tiny_graduated_at: number | null
  category: string
  frequency: string
  custom_days: string | null
  color: string
  icon: string
  created_at: number
  archived_at: number | null
}

export interface HabitCompletion {
  id: string
  habit_id: string
  completed_at: number
  note: string | null
  xp_awarded: number
}

export interface HabitLapseReflection {
  id: string
  lapse_date: number
  reason_code: string
  note: string | null
  suggested_action: string | null
  created_at: number
}

export interface HabitMicroCheckin {
  id: string
  habit_id: string
  completed_at: number
  difficulty: number
  focus_effort: number
  created_at: number
}

type CreateHabitInput = {
  id: string
  name: string
  created_at: number
  description?: string | null
  cue?: string | null
  obstacle_plan?: string | null
  tiny_mode?: number
  tiny_started_at?: number | null
  tiny_graduated_at?: number | null
  category?: string
  frequency?: string
  custom_days?: string | null
  color?: string
  icon?: string
}

export function listHabits(db: Database.Database): Habit[] {
  return db
    .prepare('SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at ASC')
    .all() as Habit[]
}

export function createHabit(db: Database.Database, data: CreateHabitInput): Habit {
  const { custom_days, ...rest } = data
  const resolvedCustomDays = custom_days ?? null
  const payload = {
    description: null,
    cue: null,
    obstacle_plan: null,
    tiny_mode: 0,
    tiny_started_at: null,
    tiny_graduated_at: null,
    category: 'general',
    frequency: 'daily',
    color: '#7c3aed',
    icon: '✨',
    ...rest,
    custom_days: resolvedCustomDays
  }

  db.prepare(`
    INSERT INTO habits (id, name, description, cue, obstacle_plan, tiny_mode, tiny_started_at, tiny_graduated_at, category, frequency, custom_days, color, icon, created_at)
    VALUES (@id, @name, @description, @cue, @obstacle_plan, @tiny_mode, @tiny_started_at, @tiny_graduated_at, @category, @frequency, @custom_days, @color, @icon, @created_at)
  `).run(payload)
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(payload.id) as Habit
}

export function updateHabit(
  db: Database.Database,
  id: string,
  data: Partial<Omit<Habit, 'id' | 'created_at'>>
): Habit {
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(', ')
  db.prepare(`UPDATE habits SET ${fields} WHERE id = @id`).run({ ...data, id })
  return db.prepare('SELECT * FROM habits WHERE id = ?').get(id) as Habit
}

export function deleteHabit(db: Database.Database, id: string): void {
  db.prepare('UPDATE habits SET archived_at = ? WHERE id = ?').run(Date.now(), id)
}

export function completeHabit(
  db: Database.Database,
  completion: Omit<HabitCompletion, 'id'> & { id: string }
): HabitCompletion {
  db.prepare(`
    INSERT INTO habit_completions (id, habit_id, completed_at, note, xp_awarded)
    VALUES (@id, @habit_id, @completed_at, @note, @xp_awarded)
  `).run(completion)
  return db
    .prepare('SELECT * FROM habit_completions WHERE id = ?')
    .get(completion.id) as HabitCompletion
}

export function uncompleteHabit(db: Database.Database, habitId: string, date: number): void {
  const dayStart = startOfDay(new Date(date)).getTime()
  const dayEnd = endOfDay(new Date(date)).getTime()
  db.prepare(
    'DELETE FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ?'
  ).run(habitId, dayStart, dayEnd)
}

export function isCompletedToday(db: Database.Database, habitId: string): boolean {
  const dayStart = startOfDay(new Date()).getTime()
  const dayEnd = endOfDay(new Date()).getTime()
  const result = db
    .prepare(
      'SELECT id FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ?'
    )
    .get(habitId, dayStart, dayEnd)
  return !!result
}

export function getHabitStreak(db: Database.Database, habitId: string): number {
  const completions = db
    .prepare(
      'SELECT completed_at FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC'
    )
    .all(habitId) as Array<{ completed_at: number }>

  if (!completions.length) return 0

  let streak = 0
  let checkDate = startOfDay(new Date())

  // If not completed today, check from yesterday
  const todayStart = checkDate.getTime()
  const todayEnd = endOfDay(new Date()).getTime()
  const completedToday = completions.some(
    (c) => c.completed_at >= todayStart && c.completed_at <= todayEnd
  )

  if (!completedToday) {
    checkDate = subDays(checkDate, 1)
  }

  for (let i = 0; i < 365; i++) {
    const dayStart = startOfDay(checkDate).getTime()
    const dayEnd = endOfDay(checkDate).getTime()
    const completed = completions.some(
      (c) => c.completed_at >= dayStart && c.completed_at <= dayEnd
    )

    if (completed) {
      streak++
      checkDate = subDays(checkDate, 1)
    } else {
      break
    }
  }

  return streak
}

export function getCompletions(
  db: Database.Database,
  habitId: string,
  from: number,
  to: number
): HabitCompletion[] {
  return db
    .prepare(
      'SELECT * FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ? ORDER BY completed_at DESC'
    )
    .all(habitId, from, to) as HabitCompletion[]
}

export function getAllCompletionsRange(
  db: Database.Database,
  from: number,
  to: number
): Array<{ habit_id: string; completed_at: number }> {
  return db
    .prepare(
      'SELECT habit_id, completed_at FROM habit_completions WHERE completed_at >= ? AND completed_at <= ?'
    )
    .all(from, to) as Array<{ habit_id: string; completed_at: number }>
}

export function getTodayCompletedCount(db: Database.Database): number {
  const dayStart = startOfDay(new Date()).getTime()
  const dayEnd = endOfDay(new Date()).getTime()
  const result = db
    .prepare(
      'SELECT COUNT(DISTINCT habit_id) as count FROM habit_completions WHERE completed_at >= ? AND completed_at <= ?'
    )
    .get(dayStart, dayEnd) as { count: number }
  return result.count
}

export function graduateTinyHabit(db: Database.Database, habitId: string): Habit {
  db.prepare(`
    UPDATE habits
    SET tiny_mode = 0,
        tiny_graduated_at = ?
    WHERE id = ?
  `).run(Date.now(), habitId)

  return db.prepare('SELECT * FROM habits WHERE id = ?').get(habitId) as Habit
}

export function listActiveHabitObstaclePlans(
  db: Database.Database,
  limit = 3
): Array<{ name: string; obstacle_plan: string }> {
  return db
    .prepare(
      `SELECT name, obstacle_plan
       FROM habits
       WHERE archived_at IS NULL
         AND obstacle_plan IS NOT NULL
         AND TRIM(obstacle_plan) <> ''
       ORDER BY created_at ASC
       LIMIT ?`
    )
    .all(limit) as Array<{ name: string; obstacle_plan: string }>
}

export function createHabitLapseReflection(
  db: Database.Database,
  reflection: HabitLapseReflection
): HabitLapseReflection {
  db.prepare(`
    INSERT INTO habit_lapse_reflections (id, lapse_date, reason_code, note, suggested_action, created_at)
    VALUES (@id, @lapse_date, @reason_code, @note, @suggested_action, @created_at)
  `).run(reflection)

  return db.prepare('SELECT * FROM habit_lapse_reflections WHERE id = ?').get(reflection.id) as HabitLapseReflection
}

export function getHabitLapseReflectionsForDate(
  db: Database.Database,
  date: number
): HabitLapseReflection[] {
  const dayStart = startOfDay(new Date(date)).getTime()
  const dayEnd = endOfDay(new Date(date)).getTime()
  return db
    .prepare(
      'SELECT * FROM habit_lapse_reflections WHERE lapse_date >= ? AND lapse_date <= ? ORDER BY created_at DESC'
    )
    .all(dayStart, dayEnd) as HabitLapseReflection[]
}

export function createHabitMicroCheckin(
  db: Database.Database,
  checkin: HabitMicroCheckin
): HabitMicroCheckin {
  db.prepare(`
    INSERT INTO habit_micro_checkins (id, habit_id, completed_at, difficulty, focus_effort, created_at)
    VALUES (@id, @habit_id, @completed_at, @difficulty, @focus_effort, @created_at)
  `).run(checkin)

  return db.prepare('SELECT * FROM habit_micro_checkins WHERE id = ?').get(checkin.id) as HabitMicroCheckin
}
