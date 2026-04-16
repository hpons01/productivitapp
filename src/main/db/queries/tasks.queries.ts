import Database from 'better-sqlite3'
import { startOfDay, endOfDay } from 'date-fns'

export interface Task {
  id: string
  title: string
  notes: string | null
  priority: number
  estimated_mins: number | null
  due_date: number | null
  completed_at: number | null
  created_at: number
  habit_id: string | null
  temptation_bundle: string | null
}

export function listTasks(db: Database.Database): Task[] {
  return db
    .prepare(
      'SELECT * FROM tasks WHERE completed_at IS NULL ORDER BY priority ASC, created_at ASC'
    )
    .all() as Task[]
}

export function createTask(db: Database.Database, data: Omit<Task, 'completed_at'>): Task {
  db.prepare(`
    INSERT INTO tasks (id, title, notes, priority, estimated_mins, due_date, created_at, habit_id, temptation_bundle)
    VALUES (@id, @title, @notes, @priority, @estimated_mins, @due_date, @created_at, @habit_id, @temptation_bundle)
  `).run(data)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(data.id) as Task
}

export function updateTask(
  db: Database.Database,
  id: string,
  data: Partial<Omit<Task, 'id' | 'created_at'>>
): Task {
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(', ')
  db.prepare(`UPDATE tasks SET ${fields} WHERE id = @id`).run({ ...data, id })
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function completeTask(db: Database.Database, id: string): Task {
  db.prepare('UPDATE tasks SET completed_at = ? WHERE id = ?').run(Date.now(), id)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function getTaskById(db: Database.Database, id: string): Task | undefined {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
}

export function deleteTask(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function listOpenScheduledTasks(db: Database.Database): Task[] {
  return db
    .prepare(
      'SELECT * FROM tasks WHERE completed_at IS NULL AND due_date IS NOT NULL ORDER BY due_date ASC'
    )
    .all() as Task[]
}

export function getTodayCompletedTaskCount(db: Database.Database): number {
  const from = startOfDay(new Date()).getTime()
  const to = endOfDay(new Date()).getTime()
  const result = db
    .prepare('SELECT COUNT(*) as count FROM tasks WHERE completed_at >= ? AND completed_at <= ?')
    .get(from, to) as { count: number }
  return result.count
}
