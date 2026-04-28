import type Database from 'better-sqlite3'
import { getDb } from '../db'
import { loadStoredSession, saveStoredSession } from '../auth/token-store'
import type { SyncTableName } from './types'

const BATCH_SIZE = 500
const REFRESH_BUFFER_MS = 60 * 1000

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  })
  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${details}`)
  }
  const data = await response.json() as { access_token: string; refresh_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }
}

async function getValidSession(): Promise<{ userId: string; accessToken: string }> {
  const session = await loadStoredSession()
  if (!session?.accessToken) throw new Error('No active session token for sync.')

  if (session.expiresAt > Date.now() + REFRESH_BUFFER_MS) {
    return { userId: session.userId, accessToken: session.accessToken }
  }

  const refreshed = await refreshAccessToken(session.refreshToken)
  await saveStoredSession({
    userId: session.userId,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt
  })
  return { userId: session.userId, accessToken: refreshed.accessToken }
}

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  }

  return { url, anonKey }
}

function nowMs(): number {
  return Date.now()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>
}

const ALLOWED_COLUMNS: Record<SyncTableName, readonly string[]> = {
  habits: [
    'id', 'name', 'description', 'cue', 'obstacle_plan', 'tiny_mode', 'tiny_started_at',
    'tiny_graduated_at', 'category', 'frequency', 'custom_days', 'color', 'icon',
    'created_at', 'archived_at', 'updated_at', 'deleted_at'
  ],
  habit_completions: [
    'id', 'habit_id', 'completed_at', 'note', 'xp_awarded', 'updated_at', 'deleted_at'
  ],
  habit_micro_checkins: [
    'id', 'habit_id', 'completed_at', 'difficulty', 'focus_effort', 'created_at',
    'updated_at', 'deleted_at'
  ],
  habit_lapse_reflections: [
    'id', 'lapse_date', 'reason_code', 'note', 'suggested_action', 'created_at',
    'updated_at', 'deleted_at'
  ],
  tasks: [
    'id', 'title', 'notes', 'priority', 'estimated_mins', 'due_date', 'completed_at',
    'created_at', 'habit_id', 'temptation_bundle', 'updated_at', 'deleted_at'
  ],
  pomodoro_sessions: [
    'id', 'task_id', 'label', 'started_at', 'ended_at', 'duration_mins', 'break_mins',
    'endless_mode', 'loop_completed', 'completed', 'interruptions', 'xp_awarded',
    'updated_at', 'deleted_at'
  ],
  pomodoro_presets: [
    'id', 'name', 'work_mins', 'break_mins', 'user_created', 'created_at',
    'updated_at', 'deleted_at'
  ],
  journal_entries: [
    'id', 'type', 'date', 'intentions', 'wins', 'gratitude', 'energy_level', 'mood_emoji',
    'reflection', 'tomorrow_prep', 'created_at', 'updated_at', 'deleted_at'
  ],
  energy_logs: [
    'id', 'logged_at', 'energy', 'mood', 'note', 'context', 'updated_at', 'deleted_at'
  ],
  xp_log: [
    'id', 'source', 'source_id', 'amount', 'base_amount', 'multiplier', 'class_id_applied',
    'evolution_tier', 'logged_at', 'updated_at', 'deleted_at'
  ],
  badges: [
    'id', 'code', 'unlocked_at', 'updated_at', 'deleted_at'
  ],
  boss_battles: [
    'id', 'name', 'week_start', 'max_hp', 'current_hp', 'defeated', 'loot_tier',
    'loot_claimed', 'updated_at', 'deleted_at'
  ],
  daily_quests: [
    'id', 'date', 'quest_type', 'description', 'target', 'progress', 'completed',
    'xp_reward', 'focus_reward', 'egg_reward_tier', 'status', 'time_window_type',
    'enrolled_at', 'started_at', 'deadline_at', 'completed_at', 'failed_at',
    'abandoned_at', 'milestones_awarded', 'reward_xp_awarded', 'sanction_xp',
    'updated_at', 'deleted_at'
  ],
  quest_enrollments: [
    'id', 'quest_id', 'status', 'time_window_type', 'enrolled_at', 'started_at',
    'deadline_at', 'completed_at', 'failed_at', 'abandoned_at', 'last_progress_at',
    'created_at', 'updated_at', 'deleted_at'
  ],
  quest_outcomes: [
    'id', 'quest_id', 'outcome_type', 'milestone_index', 'xp_delta', 'recorded_at',
    'metadata', 'updated_at', 'deleted_at'
  ],
  catalog_enrollments: [
    'id', 'definition_id', 'status', 'progress', 'milestones_awarded', 'reward_xp_awarded',
    'sanction_xp', 'enrolled_at', 'deadline_at', 'completed_at', 'failed_at',
    'abandoned_at', 'last_progress_at', 'updated_at', 'deleted_at'
  ],
  pets: [
    'id', 'definition_id', 'egg_id', 'name', 'total_xp', 'level', 'obtained_at',
    'equipped', 'updated_at', 'deleted_at'
  ],
  pet_eggs: [
    'id', 'tier', 'source_quest_id', 'earned_at', 'hatched_at', 'pet_id',
    'updated_at', 'deleted_at'
  ],
  pet_xp_log: [
    'id', 'pet_id', 'source', 'source_xp', 'pet_xp_gain', 'logged_at',
    'updated_at', 'deleted_at'
  ],
  focus_log: [
    'id', 'type', 'source', 'source_id', 'amount', 'balance', 'logged_at',
    'updated_at', 'deleted_at'
  ],
  shop_purchases: [
    'id', 'date_seed', 'item_id', 'item_type', 'focus_cost', 'purchased_at',
    'updated_at', 'deleted_at'
  ],
  loot_inventory: [
    'id', 'type', 'tier', 'payload', 'earned_at', 'used_at', 'updated_at', 'deleted_at'
  ],
  settings: [
    'id', 'key', 'value', 'updated_at', 'deleted_at'
  ]
}

function sanitizeRow(table: SyncTableName, row: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set(ALLOWED_COLUMNS[table])
  const sanitized: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    if (allowed.has(key)) {
      sanitized[key] = row[key]
    }
  }
  sanitized.updated_at = (row.updated_at as number | null) ?? nowMs()
  return sanitized
}

function selectPushRows(db: Database.Database, table: SyncTableName, since: number): Record<string, unknown>[] {
  if (table === 'badges') {
    return db
      .prepare('SELECT id, code, unlocked_at, updated_at FROM badges WHERE COALESCE(updated_at, 0) > ?')
      .all(since) as Record<string, unknown>[]
  }

  if (table === 'settings') {
    return db
      .prepare('SELECT id, key, value, updated_at FROM settings WHERE COALESCE(updated_at, 0) > ?')
      .all(since) as Record<string, unknown>[]
  }

  return db
    .prepare(`SELECT * FROM ${table} WHERE COALESCE(updated_at, 0) > ?`)
    .all(since) as Record<string, unknown>[]
}

async function postUpsert(
  table: SyncTableName,
  userId: string,
  accessToken: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  if (!rows.length) return

  const { url, anonKey } = getSupabaseConfig()
  const endpoint = `${url}/rest/v1/${table}`
  const payload = rows.map((row) => ({ ...sanitizeRow(table, row), user_id: userId }))

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Push failed for ${table}: ${response.status} ${body || response.statusText}`)
  }
}

export async function pushTable(table: SyncTableName, userId: string, since: number): Promise<void> {
  const { accessToken } = await getValidSession()

  const db = getDb()
  const rows = selectPushRows(db, table, since)
  if (!rows.length) return

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const page = rows.slice(i, i + BATCH_SIZE)
    await postUpsert(table, userId, accessToken, page)
  }
}

async function pullPage(
  table: SyncTableName,
  userId: string,
  since: number,
  offset: number,
  accessToken: string
): Promise<Record<string, unknown>[]> {
  const { url, anonKey } = getSupabaseConfig()
  const endpoint = new URL(`${url}/rest/v1/${table}`)
  endpoint.searchParams.set('select', '*')
  endpoint.searchParams.set('user_id', `eq.${userId}`)
  endpoint.searchParams.set('updated_at', `gt.${since}`)
  endpoint.searchParams.set('order', 'updated_at.asc')
  endpoint.searchParams.set('limit', String(BATCH_SIZE))
  endpoint.searchParams.set('offset', String(offset))

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Pull failed for ${table}: ${response.status} ${body || response.statusText}`)
  }

  return (await response.json()) as Record<string, unknown>[]
}

function upsertLocal(db: Database.Database, table: SyncTableName, row: Record<string, unknown>): void {
  const local = { ...row }
  delete local.user_id

  if (table === 'badges') {
    db.prepare(
      'UPDATE badges SET unlocked_at = ?, updated_at = ? WHERE id = ? OR code = ?'
    ).run(local.unlocked_at ?? null, local.updated_at ?? nowMs(), local.id, local.code)
    return
  }

  // settings: local PK is `key`, not `id`
  if (table === 'settings') {
    db.prepare(`
      INSERT INTO settings (id, key, value, updated_at)
      VALUES (@id, @key, @value, @updated_at)
      ON CONFLICT(key) DO UPDATE SET
        id         = excluded.id,
        value      = excluded.value,
        updated_at = excluded.updated_at
    `).run(asRecord(local))
    return
  }

  const keys = Object.keys(local)
  if (!keys.length) return

  const columns = keys.join(', ')
  const placeholders = keys.map((key) => `@${key}`).join(', ')
  const updates = keys.map((key) => `${key} = excluded.${key}`).join(', ')

  db.prepare(`
    INSERT INTO ${table} (${columns})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updates}
  `).run(asRecord(local))
}

export async function pullTable(table: SyncTableName, userId: string, since: number): Promise<void> {
  const { accessToken } = await getValidSession()

  const db = getDb()
  let offset = 0

  while (true) {
    const rows = await pullPage(table, userId, since, offset, accessToken)
    if (!rows.length) break

    const tx = db.transaction(() => {
      for (const row of rows) {
        upsertLocal(db, table, sanitizeRow(table, row))
      }
    })

    tx()

    if (rows.length < BATCH_SIZE) break
    offset += rows.length
  }
}
