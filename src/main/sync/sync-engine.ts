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
  const data = await response.json()
  if (
    typeof data?.access_token !== 'string' ||
    typeof data?.refresh_token !== 'string' ||
    typeof data?.expires_in !== 'number'
  ) {
    throw new Error(`Token refresh returned unexpected payload: ${JSON.stringify(data)}`)
  }
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000
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
    // Always push ALL unlocked badges, ignoring `since`. Locked badge rows are catalog
    // seed data that must not be pushed (hardcoded IDs collide across users in Supabase).
    // Using `since` would leave badges unlocked before the last sync stranded — they
    // would never reach Supabase and wouldn't appear on other devices.
    return db
      .prepare('SELECT id, code, unlocked_at, updated_at FROM badges WHERE unlocked_at IS NOT NULL')
      .all() as Record<string, unknown>[]
  }

  if (table === 'settings') {
    return db
      .prepare('SELECT id, key, value, updated_at FROM settings WHERE COALESCE(updated_at, 0) > ?')
      .all(since) as Record<string, unknown>[]
  }

  // Exclude system-seeded default presets: they have hardcoded IDs that collide across
  // users in Supabase, causing RLS USING violations on the ON CONFLICT DO UPDATE path.
  if (table === 'pomodoro_presets') {
    return db
      .prepare('SELECT * FROM pomodoro_presets WHERE user_created = 1 AND COALESCE(updated_at, 0) > ?')
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
  // Badges use (user_id, code) as the natural unique key — not the PK —
  // because local IDs are hardcoded strings that may differ between devices.
  // Using on_conflict=user_id,code ensures upsert resolves on the right constraint.
  const conflictParam = table === 'badges' ? '?on_conflict=user_id,code' : ''
  const endpoint = `${url}/rest/v1/${table}${conflictParam}`
  const payload = rows.map((row) => {
    const sanitized = { ...sanitizeRow(table, row), user_id: userId }
    if (table === 'badges') {
      // Badge IDs are hardcoded strings (e.g. 'badge_streak_3') that collide as PKs
      // across users. Scope them per user so each user gets a unique row in Supabase.
      sanitized.id = `${userId}__${String(sanitized.code ?? sanitized.id)}`
    }
    return sanitized
  })

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

export async function pushTable(table: SyncTableName, since: number): Promise<void> {
  const { userId, accessToken } = await getValidSession()

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
    // Match by code — Supabase IDs are user-scoped ('{userId}__{code}') and differ from
    // local IDs. Fall back to INSERT if the badge row was somehow deleted.
    const result = db.prepare(
      'UPDATE badges SET unlocked_at = ?, updated_at = ? WHERE code = ?'
    ).run(local.unlocked_at ?? null, local.updated_at ?? nowMs(), local.code)
    if (result.changes === 0) {
      db.prepare(
        'INSERT OR IGNORE INTO badges (id, code, unlocked_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(local.code, local.code, local.unlocked_at ?? null, local.updated_at ?? nowMs())
    }
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

export async function pullTable(table: SyncTableName, since: number): Promise<void> {
  const { userId, accessToken } = await getValidSession()

  const db = getDb()
  let offset = 0
  // Badges: always pull all (ignore since) — mirrors selectPushRows logic and ensures
  // old-format rows (with stale updated_at) are always reconciled on every sync.
  const effectiveSince = table === 'badges' ? 0 : since

  while (true) {
    const rows = await pullPage(table, userId, effectiveSince, offset, accessToken)
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
