import { ipcMain } from 'electron'
import { getDb } from '../db'
import { listTasks, createTask, updateTask, completeTask, deleteTask } from '../db/queries/tasks.queries'
import { addXP, damageBoss } from '../db/queries/gamification.queries'

export function registerTasksIpc(): void {
  ipcMain.handle('tasks:list', () => {
    const db = getDb()
    return listTasks(db)
  })

  ipcMain.handle('tasks:create', (_event, data) => {
    const db = getDb()
    return createTask(db, data)
  })

  ipcMain.handle('tasks:update', (_event, data) => {
    const db = getDb()
    const { id, ...rest } = data
    return updateTask(db, id, rest)
  })

  ipcMain.handle('tasks:complete', (_event, id: string) => {
    const db = getDb()
    const task = completeTask(db, id)

    // XP: 10 for normal, 5 for 2-min tasks (quick = less effort)
    const xpAmount = task.estimated_mins && task.estimated_mins <= 2 ? 5 : 10
    addXP(db, 'task', id, xpAmount)

    // Damage boss
    try {
      damageBoss(db, 15)
    } catch {}

    return { ...task, xpAwarded: xpAmount }
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    const db = getDb()
    deleteTask(db, id)
    return { success: true }
  })
}
