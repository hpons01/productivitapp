import { ipcMain, dialog, app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { getDb } from '../db'

export function registerExportIpc(): void {
  ipcMain.handle('export:data', async (_event, format: 'csv' | 'json') => {
    const db = getDb()

    const habits      = db.prepare('SELECT * FROM habits').all()
    const completions = db.prepare('SELECT * FROM habit_completions ORDER BY completed_at DESC').all()
    const tasks       = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
    const journal     = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all()
    const pomodoros   = db.prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()
    const energy      = db.prepare('SELECT * FROM energy_logs ORDER BY logged_at DESC').all()
    const xpLog       = db.prepare('SELECT * FROM xp_log ORDER BY logged_at DESC').all()

    const date = new Date().toISOString().slice(0, 10)
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Your Data',
      defaultPath: join(app.getPath('downloads'), `productivitapp-${date}.${format}`),
      filters:
        format === 'csv'
          ? [{ name: 'CSV Files', extensions: ['csv'] }]
          : [{ name: 'JSON Files', extensions: ['json'] }]
    })

    if (!filePath) return { success: false }

    if (format === 'json') {
      const data = {
        exportedAt: new Date().toISOString(),
        habits,
        completions,
        tasks,
        journal,
        pomodoros,
        energy,
        xpLog
      }
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } else {
      writeFileSync(
        filePath,
        buildCSV({ habits, completions, tasks, journal, pomodoros }),
        'utf-8'
      )
    }

    return { success: true, filePath }
  })
}

type Row = Record<string, unknown>

function buildCSV(data: {
  habits: Row[]
  completions: Row[]
  tasks: Row[]
  journal: Row[]
  pomodoros: Row[]
}): string {
  const esc = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`
  const table = (cols: string[], items: Row[]): string =>
    [cols.join(','), ...items.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')

  return [
    '# HABITS',
    table(['id', 'name', 'category', 'frequency', 'color', 'icon', 'created_at'], data.habits),
    '\n# HABIT COMPLETIONS',
    table(['id', 'habit_id', 'completed_at', 'xp_awarded'], data.completions),
    '\n# TASKS',
    table(['id', 'title', 'priority', 'estimated_mins', 'due_date', 'completed_at', 'created_at'], data.tasks),
    '\n# JOURNAL ENTRIES',
    table(['id', 'type', 'date', 'energy_level', 'mood_emoji', 'created_at'], data.journal),
    '\n# POMODORO SESSIONS',
    table(
      ['id', 'label', 'started_at', 'ended_at', 'duration_mins', 'completed', 'interruptions', 'xp_awarded'],
      data.pomodoros
    )
  ].join('\n')
}
