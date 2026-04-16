import { ipcMain, dialog, app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getDb } from '../db'

type Row = Record<string, unknown>
type ImportMode = 'replace' | 'merge'

type ExportPayload = {
  exportedAt?: string
  habits?: Row[]
  completions?: Row[]
  tasks?: Row[]
  journal?: Row[]
  pomodoros?: Row[]
  energy?: Row[]
  xpLog?: Row[]
}

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

  ipcMain.handle('export:importData', async (_event, mode: ImportMode) => {
    if (mode !== 'replace' && mode !== 'merge') {
      return { success: false, error: 'Invalid import mode.' }
    }

    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Backup Data',
      defaultPath: app.getPath('downloads'),
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    })

    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    try {
      const filePath = filePaths[0]
      const content = readFileSync(filePath, 'utf-8')
      if (Buffer.byteLength(content, 'utf-8') > 100 * 1024 * 1024) {
        return { success: false, error: 'Import file exceeds 100MB limit.' }
      }

      const payload = JSON.parse(content) as ExportPayload
      validateImportPayload(payload)

      const db = getDb()
      const importedCounts: Record<string, number> = {}

      const runImport = db.transaction(() => {
        if (mode === 'replace') {
          db.exec(`
            DELETE FROM habit_completions;
            DELETE FROM habits;
            DELETE FROM tasks;
            DELETE FROM journal_entries;
            DELETE FROM pomodoro_sessions;
            DELETE FROM energy_logs;
            DELETE FROM xp_log;
          `)
        }

        importedCounts.habits = importRows(db, 'habits', payload.habits ?? [], mode)
        importedCounts.completions = importRows(db, 'habit_completions', payload.completions ?? [], mode)
        importedCounts.tasks = importRows(db, 'tasks', payload.tasks ?? [], mode)
        importedCounts.journal = importRows(db, 'journal_entries', payload.journal ?? [], mode)
        importedCounts.pomodoros = importRows(db, 'pomodoro_sessions', payload.pomodoros ?? [], mode)
        importedCounts.energy = importRows(db, 'energy_logs', payload.energy ?? [], mode)
        importedCounts.xpLog = importRows(db, 'xp_log', payload.xpLog ?? [], mode)
      })

      runImport()

      return {
        success: true,
        mode,
        filePath,
        importedCounts,
        totalImported: Object.values(importedCounts).reduce((sum, v) => sum + v, 0)
      }
    } catch (error) {
      console.error('Import failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed due to an unknown error.'
      }
    }
  })
}

function validateImportPayload(payload: ExportPayload): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid file format.')
  }

  const keys: Array<keyof Omit<ExportPayload, 'exportedAt'>> = [
    'habits',
    'completions',
    'tasks',
    'journal',
    'pomodoros',
    'energy',
    'xpLog'
  ]

  for (const key of keys) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) {
      throw new Error(`Invalid format for ${key}. Expected an array.`)
    }
  }
}

function getTableColumns(db: ReturnType<typeof getDb>, tableName: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return rows.map((row) => row.name)
}

function importRows(
  db: ReturnType<typeof getDb>,
  tableName: string,
  rows: Row[],
  mode: ImportMode
): number {
  if (!rows.length) return 0

  const tableColumns = new Set(getTableColumns(db, tableName))
  const statementCache = new Map<string, ReturnType<ReturnType<typeof getDb>['prepare']>>()
  let inserted = 0
  const insertBehavior = mode === 'replace' ? 'REPLACE' : 'IGNORE'

  for (const row of rows) {
    const columns = Object.keys(row).filter((column) => tableColumns.has(column))
    if (columns.length === 0) continue

    const cacheKey = columns.join('|')
    let statement = statementCache.get(cacheKey)
    if (!statement) {
      const placeholders = columns.map(() => '?').join(', ')
      const sql = `INSERT OR ${insertBehavior} INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
      statement = db.prepare(sql)
      statementCache.set(cacheKey, statement)
    }

    statement.run(...columns.map((column) => row[column]))
    inserted += 1
  }

  return inserted
}

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
