import { getDb } from '../db'
import { getSetting, setSetting } from '../db/queries/settings.queries'
import { pullTable, pushTable } from './sync-engine'
import type { SyncStatus, SyncTableName } from './types'

const LAST_SYNCED_KEY = 'sync_last_synced_at'

const SYNC_TABLES: SyncTableName[] = [
  'habits',
  'task_projects',
  'tasks',
  'journal_entries',
  'energy_logs',
  'pomodoro_presets',
  'pomodoro_sessions',
  'badges',
  'xp_log',
  'boss_battles',
  'daily_quests',
  'quest_enrollments',
  'quest_outcomes',
  'catalog_enrollments',
  'pets',
  'pet_eggs',
  'pet_xp_log',
  'focus_log',
  'shop_purchases',
  'loot_inventory',
  'habit_lapse_reflections',
  'habit_micro_checkins',
  'habit_completions',
  'settings'
]

let status: SyncStatus = {
  inProgress: false,
  lastSyncedAt: null,
  error: null
}

let statusListener: ((next: SyncStatus) => void) | null = null

function parseLastSynced(raw: string | null): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function emitStatus(next: SyncStatus): void {
  status = next
  statusListener?.(status)
}

function getLastSyncedAt(): number {
  const db = getDb()
  const fromSettings = parseLastSynced(getSetting(db, LAST_SYNCED_KEY))
  return fromSettings ?? 0
}

function setLastSyncedAt(value: number): void {
  const db = getDb()
  setSetting(db, LAST_SYNCED_KEY, String(value))
}

export function isNewDevice(): boolean {
  const db = getDb()
  const habitsCount = (db.prepare('SELECT COUNT(*) as n FROM habits').get() as { n: number }).n
  const tasksCount = (db.prepare('SELECT COUNT(*) as n FROM tasks').get() as { n: number }).n
  const journalCount = (db.prepare('SELECT COUNT(*) as n FROM journal_entries').get() as { n: number }).n
  return habitsCount + tasksCount + journalCount === 0
}

export function getSyncStatus(): SyncStatus {
  const lastSyncedAt = parseLastSynced(getSetting(getDb(), LAST_SYNCED_KEY))
  if (lastSyncedAt !== status.lastSyncedAt) {
    status = { ...status, lastSyncedAt }
  }
  return status
}

export function setSyncStatusListener(fn: (next: SyncStatus) => void): void {
  statusListener = fn
}

export async function runSync(opts: { fullPull?: boolean; skipPush?: boolean } = {}): Promise<void> {
  if (status.inProgress) return

  const since = opts.fullPull ? 0 : getLastSyncedAt()
  const syncStartedAt = Date.now()
  const db = getDb()

  emitStatus({
    inProgress: true,
    lastSyncedAt: status.lastSyncedAt,
    error: null
  })

  try {
    if (!opts.skipPush) {
      for (const table of SYNC_TABLES) {
        await pushTable(table, since)
      }
    }

    db.pragma('foreign_keys = OFF')
    try {
      for (const table of SYNC_TABLES) {
        await pullTable(table, since)
      }
    } finally {
      db.pragma('foreign_keys = ON')
    }

    setLastSyncedAt(syncStartedAt)

    emitStatus({
      inProgress: false,
      lastSyncedAt: syncStartedAt,
      error: null
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'
    console.error('[Sync] runSync failed', error)
    emitStatus({
      inProgress: false,
      lastSyncedAt: status.lastSyncedAt,
      error: message
    })
  }
}
