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
  task_type: 'classic' | 'kanban'
  progress: 'backlog' | 'not_started' | 'ongoing' | 'done'
  project_id: string | null
  sort_order: number | null
}

export interface TaskProject {
  id: string
  name: string
  created_at: number
}

export function listTasks(db: Database.Database): Task[] {
  return db
    .prepare(
      'SELECT * FROM tasks WHERE completed_at IS NULL AND deleted_at IS NULL ORDER BY priority ASC, created_at ASC'
    )
    .all() as Task[]
}

export function createTask(db: Database.Database, data: Omit<Task, 'completed_at'>): Task {
  const now = Date.now()
  db.prepare(`
    INSERT INTO tasks (
      id, title, notes, priority, estimated_mins, due_date, created_at,
      habit_id, temptation_bundle, task_type, progress, project_id, sort_order, updated_at
    )
    VALUES (
      @id, @title, @notes, @priority, @estimated_mins, @due_date, @created_at,
      @habit_id, @temptation_bundle, @task_type, @progress, @project_id, @sort_order, @updated_at
    )
  `).run({ ...data, updated_at: now })
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
  db.prepare(`UPDATE tasks SET ${fields}, updated_at = @updated_at WHERE id = @id`).run({ ...data, id, updated_at: Date.now() })
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function completeTask(db: Database.Database, id: string): Task {
  const now = Date.now()
  db.prepare("UPDATE tasks SET completed_at = ?, progress = 'done', updated_at = ? WHERE id = ?").run(now, now, id)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function listTaskProjects(db: Database.Database): TaskProject[] {
  return db
    .prepare('SELECT * FROM task_projects WHERE deleted_at IS NULL ORDER BY name ASC')
    .all() as TaskProject[]
}

export function createTaskProject(db: Database.Database, data: TaskProject): TaskProject {
  const now = Date.now()
  db.prepare(`
    INSERT INTO task_projects (id, name, created_at, updated_at)
    VALUES (@id, @name, @created_at, @updated_at)
  `).run({ ...data, updated_at: now })
  return db.prepare('SELECT * FROM task_projects WHERE id = ?').get(data.id) as TaskProject
}

export function updateTaskProject(db: Database.Database, id: string, name: string): TaskProject {
  db.prepare('UPDATE task_projects SET name = ?, updated_at = ? WHERE id = ?').run(name, Date.now(), id)
  return db.prepare('SELECT * FROM task_projects WHERE id = ?').get(id) as TaskProject
}

export function deleteTaskProject(db: Database.Database, id: string): void {
  const now = Date.now()
  db.prepare('UPDATE task_projects SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
}

export function getTaskById(db: Database.Database, id: string): Task | undefined {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
}

export function deleteTask(db: Database.Database, id: string): void {
  const now = Date.now()
  db.prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
}

export function listOpenScheduledTasks(db: Database.Database): Task[] {
  return db
    .prepare(
      'SELECT * FROM tasks WHERE completed_at IS NULL AND deleted_at IS NULL AND due_date IS NOT NULL ORDER BY due_date ASC'
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
