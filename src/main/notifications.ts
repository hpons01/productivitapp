import { BrowserWindow, Notification } from 'electron'
import { getDb } from './db'
import { listOpenScheduledTasks } from './db/queries/tasks.queries'
import { listActiveHabitObstaclePlans } from './db/queries/habits.queries'

interface ScheduledNotification {
  id: string
  title: string
  body: string
  scheduledAt: number
  timeout?: ReturnType<typeof setTimeout>
}

const scheduledNotifications = new Map<string, ScheduledNotification>()
const TASK_REMINDER_OFFSET_MS = 5 * 60 * 1000
const MAX_TIMEOUT_MS = 2147483647

function getTaskReminderId(taskId: string): string {
  return `task-reminder-${taskId}`
}

function emitTaskReminder(taskId: string, title: string, dueDate: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('task:reminder', { taskId, title, dueDate })
    }
  }
}

export function sendNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
}

export function scheduleNotification(
  id: string,
  title: string,
  body: string,
  atMs: number
): void {
  // Cancel existing
  cancelNotification(id)

  const delay = atMs - Date.now()
  if (delay <= 0) return

  const timeout = setTimeout(() => {
    sendNotification(title, body)
    scheduledNotifications.delete(id)
  }, Math.min(delay, 2147483647)) // Max setTimeout value

  scheduledNotifications.set(id, { id, title, body, scheduledAt: atMs, timeout })
}

export function cancelNotification(id: string): void {
  const existing = scheduledNotifications.get(id)
  if (existing?.timeout) {
    clearTimeout(existing.timeout)
  }
  scheduledNotifications.delete(id)
}

export function scheduleNotifications(): void {
  // Re-schedule notifications based on settings
  // Called on app start and whenever settings change
  try {
    const db = getDb()
    const settings = db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string
      value: string
    }>
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

    scheduleDailyNotifications(settingsMap)
  } catch {
    // DB not ready yet — will be called again after init
  }
}

export function scheduleTaskReminder(taskId: string, title: string, dueDate: number | null): void {
  const notificationId = getTaskReminderId(taskId)
  cancelNotification(notificationId)

  if (!dueDate) return

  const now = Date.now()
  if (dueDate <= now) return

  const reminderAt = dueDate - TASK_REMINDER_OFFSET_MS
  const effectiveAt = reminderAt <= now ? now + 500 : reminderAt

  const delay = effectiveAt - now
  const timeout = setTimeout(() => {
    if (effectiveAt - Date.now() > MAX_TIMEOUT_MS) {
      scheduleTaskReminder(taskId, title, dueDate)
      return
    }

    sendNotification('⏰ Task starting soon', `${title} starts in 5 minutes.`)
    emitTaskReminder(taskId, title, dueDate)
    scheduledNotifications.delete(notificationId)
  }, Math.min(delay, MAX_TIMEOUT_MS))

  scheduledNotifications.set(notificationId, {
    id: notificationId,
    title: '⏰ Task starting soon',
    body: `${title} starts in 5 minutes.`,
    scheduledAt: effectiveAt,
    timeout
  })
}

export function cancelTaskReminder(taskId: string): void {
  cancelNotification(getTaskReminderId(taskId))
}

export function snoozeTaskReminder(
  taskId: string,
  title: string,
  dueDate: number | null,
  snoozeMins = 5
): void {
  const notificationId = getTaskReminderId(taskId)
  cancelNotification(notificationId)

  const atMs = Date.now() + snoozeMins * 60 * 1000
  const timeout = setTimeout(() => {
    sendNotification('😴 Snoozed task reminder', `${title} is still waiting for you.`)
    emitTaskReminder(taskId, title, dueDate ?? atMs)
    scheduledNotifications.delete(notificationId)
  }, Math.min(snoozeMins * 60 * 1000, 2147483647))

  scheduledNotifications.set(notificationId, {
    id: notificationId,
    title: '😴 Snoozed task reminder',
    body: `${title} is still waiting for you.`,
    scheduledAt: atMs,
    timeout
  })
}

export function rehydrateTaskReminders(): void {
  try {
    const db = getDb()
    const tasks = listOpenScheduledTasks(db)
    for (const task of tasks) {
      scheduleTaskReminder(task.id, task.title, task.due_date)
    }
  } catch {
    // DB may not be ready yet; startup sequence will retry on next launch.
  }
}

function scheduleDailyNotifications(settings: Record<string, string>): void {
  // Morning ritual reminder
  const morningTime = settings['notification_morning_time'] || '07:00'
  scheduleDailyAt(
    'morning-ritual',
    '🌅 Morning Ritual',
    buildMorningRitualReminderBody(),
    morningTime
  )

  // Evening reflection reminder
  const eveningTime = settings['notification_evening_time'] || '21:00'
  scheduleDailyAt('evening-reflection', '🌙 Evening Reflection', "Take a moment to reflect on your wins today.", eveningTime)

  // Streak warning (8pm if not active)
  scheduleDailyAt('streak-warning', '🔥 Streak at Risk!', "Don't forget to check in with your habits today.", '20:00')
}

function buildMorningRitualReminderBody(): string {
  const defaultBody = 'Time to set your intentions for today!'

  try {
    const db = getDb()
    const plans = listActiveHabitObstaclePlans(db, 2)
    if (plans.length === 0) {
      return defaultBody
    }

    const lines = plans.map((plan) => `${plan.name}: ${plan.obstacle_plan}`)
    return `Plan for resistance: ${lines.join(' | ')}`
  } catch {
    return defaultBody
  }
}

function scheduleDailyAt(id: string, title: string, body: string, timeStr: string): void {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)

  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }

  scheduleNotification(id, title, body, target.getTime())
}

export function scheduleEnergyCheckIns(): void {
  const now = new Date()
  const endHour = 20

  for (let h = now.getHours() + 2; h <= endHour; h += 2) {
    const target = new Date()
    target.setHours(h, 0, 0, 0)
    if (target > now) {
      scheduleNotification(
        `energy-${h}`,
        '⚡ Energy Check-in',
        'How are your energy levels right now?',
        target.getTime()
      )
    }
  }
}
