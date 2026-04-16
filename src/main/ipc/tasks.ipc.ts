import { ipcMain } from 'electron'
import { getDb } from '../db'
import { listTasks, createTask, updateTask, completeTask, deleteTask, getTaskById } from '../db/queries/tasks.queries'
import { awardXP, damageBoss } from '../db/queries/gamification.queries'
import { cancelTaskReminder, scheduleTaskReminder, snoozeTaskReminder } from '../notifications'
import { incrementQuestProgressByType } from '../db/queries/quests.queries'
import { logEvent } from '../db/queries/eventlog.queries'
import { emitQuestCompletions } from './quest-notifications'

export function registerTasksIpc(): void {
  ipcMain.handle('tasks:list', () => {
    const db = getDb()
    return listTasks(db)
  })

  ipcMain.handle('tasks:create', (_event, data) => {
    const db = getDb()
    const task = createTask(db, data)
    scheduleTaskReminder(task.id, task.title, task.due_date)
    logEvent(db, 'task_created', 'task', task.id, { priority: task.priority, dueDate: task.due_date })
    return task
  })

  ipcMain.handle('tasks:update', (_event, data) => {
    const db = getDb()
    const { id, ...rest } = data
    const task = updateTask(db, id, rest)
    scheduleTaskReminder(task.id, task.title, task.due_date)
    return task
  })

  ipcMain.handle('tasks:complete', (_event, id: string) => {
    const db = getDb()
    cancelTaskReminder(id)
    const task = completeTask(db, id)

    // XP: 10 for normal, 5 for 2-min tasks (quick = less effort)
    const baseXP = task.estimated_mins && task.estimated_mins <= 2 ? 5 : 10
    const xpAward = awardXP(db, 'task', id, baseXP)
    logEvent(db, 'task_completed', 'task', id, {
      baseXP,
      xpAwarded: xpAward.finalAmount,
      isTwoMin: Boolean(task.estimated_mins && task.estimated_mins <= 2)
    })

    // Damage boss
    try {
      damageBoss(db, 15)
    } catch {}

    // Enrolled quest progress updates.
    emitQuestCompletions(incrementQuestProgressByType(db, 'tasks', 1), 'tasks')
    if (task.estimated_mins && task.estimated_mins <= 2) {
      emitQuestCompletions(incrementQuestProgressByType(db, 'two_min_tasks', 1), 'two_min_tasks')
    }

    return {
      ...task,
      xpAwarded: xpAward.finalAmount,
      baseXP: xpAward.baseAmount,
      multiplier: xpAward.multiplier
    }
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    const db = getDb()
    cancelTaskReminder(id)
    deleteTask(db, id)
    logEvent(db, 'task_deleted', 'task', id, null)
    return { success: true }
  })

  ipcMain.handle('tasks:snoozeReminder', (_event, taskId: string, minutes = 5) => {
    const db = getDb()
    const task = getTaskById(db, taskId)
    if (!task || task.completed_at) return { success: false }

    snoozeTaskReminder(task.id, task.title, task.due_date, minutes)
    logEvent(db, 'task_reminder_snoozed', 'task', task.id, { minutes })
    return { success: true }
  })
}
