import { app } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync } from 'fs'
import { createRequire } from 'module'
import { ALL_PET_DEFINITIONS } from '../domain/pets'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3') as typeof import('better-sqlite3')

let db: Database.Database

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'productivitapp.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
  ensureClassXpColumns()
  ensurePetQuestColumns()
  ensurePomodoroPresets()
  ensureDefaultSettings()
  seedBadges()
  seedPetDefinitions()
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

function runMigrations(): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `)

  const migrationsDir = join(__dirname, 'migrations')
  let migrationFiles: string[] = []

  try {
    migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    // Migrations directory doesn't exist yet; run inline migrations
    runInlineMigrations()
    return
  }

  for (const file of migrationFiles) {
    const version = file.replace('.sql', '')
    const applied = db
      .prepare('SELECT version FROM schema_migrations WHERE version = ?')
      .get(version)

    if (!applied) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        version,
        Date.now()
      )
      console.log(`[DB] Applied migration: ${version}`)
    }
  }
}

function runInlineMigrations(): void {
  const migrations = [
    { version: '001_initial', sql: INITIAL_SCHEMA },
    { version: '002_energy', sql: ENERGY_SCHEMA },
    { version: '003_badges', sql: BADGES_SCHEMA },
    { version: '004_pets', sql: PETS_SCHEMA }
  ]

  for (const { version, sql } of migrations) {
    const applied = db
      .prepare('SELECT version FROM schema_migrations WHERE version = ?')
      .get(version)

    if (!applied) {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        version,
        Date.now()
      )
    }
  }
}

function ensureDefaultSettings(): void {
  const defaults: Record<string, string> = {
    onboarding_completed: 'false',
    theme: 'dark',
    selected_character_class: 'apprentice'
  }

  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, value)
  }
}

function ensureClassXpColumns(): void {
  const tableInfo = db.prepare('PRAGMA table_info(xp_log)').all() as Array<{ name: string }>
  const columns = new Set(tableInfo.map((c) => c.name))

  if (!columns.has('base_amount')) {
    db.exec('ALTER TABLE xp_log ADD COLUMN base_amount INTEGER')
  }

  if (!columns.has('multiplier')) {
    db.exec('ALTER TABLE xp_log ADD COLUMN multiplier REAL')
  }

  if (!columns.has('class_id_applied')) {
    db.exec('ALTER TABLE xp_log ADD COLUMN class_id_applied TEXT')
  }

  if (!columns.has('evolution_tier')) {
    db.exec('ALTER TABLE xp_log ADD COLUMN evolution_tier INTEGER')
  }

  db.exec('UPDATE xp_log SET base_amount = amount WHERE base_amount IS NULL')
  db.exec('UPDATE xp_log SET multiplier = 1 WHERE multiplier IS NULL')
}

function ensurePetQuestColumns(): void {
  const tableInfo = db.prepare('PRAGMA table_info(daily_quests)').all() as Array<{ name: string }>
  const columns = new Set(tableInfo.map((c) => c.name))

  if (!columns.has('egg_reward_tier')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN egg_reward_tier TEXT')
  }
}

function ensurePomodoroPresets(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pomodoro_presets (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      work_mins     INTEGER NOT NULL,
      break_mins    INTEGER NOT NULL,
      user_created  INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pomodoro_presets_user
      ON pomodoro_presets(user_created, created_at);
  `)

  const defaults = [
    { id: 'default-25-5', name: '25 / 5', work_mins: 25, break_mins: 5 },
    { id: 'default-50-10', name: '50 / 10', work_mins: 50, break_mins: 10 },
    { id: 'default-90-15', name: '90 / 15', work_mins: 90, break_mins: 15 },
    { id: 'default-15-3', name: '15 / 3', work_mins: 15, break_mins: 3 }
  ]

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO pomodoro_presets (id, name, work_mins, break_mins, user_created, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `)

  for (const preset of defaults) {
    stmt.run(preset.id, preset.name, preset.work_mins, preset.break_mins, Date.now())
  }
}

const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS habits (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  cue         TEXT,
  category    TEXT DEFAULT 'general',
  frequency   TEXT NOT NULL DEFAULT 'daily',
  custom_days TEXT,
  color       TEXT DEFAULT '#7c3aed',
  icon        TEXT DEFAULT '✨',
  created_at  INTEGER NOT NULL,
  archived_at INTEGER
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id           TEXT PRIMARY KEY,
  habit_id     TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_at INTEGER NOT NULL,
  note         TEXT,
  xp_awarded   INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_day
  ON habit_completions(habit_id, completed_at);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id             TEXT PRIMARY KEY,
  task_id        TEXT,
  label          TEXT,
  started_at     INTEGER NOT NULL,
  ended_at       INTEGER,
  duration_mins  INTEGER NOT NULL DEFAULT 25,
  break_mins     INTEGER NOT NULL DEFAULT 5,
  completed      INTEGER NOT NULL DEFAULT 0,
  interruptions  INTEGER DEFAULT 0,
  xp_awarded     INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pomodoro_started ON pomodoro_sessions(started_at);

CREATE TABLE IF NOT EXISTS pomodoro_presets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  work_mins     INTEGER NOT NULL,
  break_mins    INTEGER NOT NULL,
  user_created  INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pomodoro_presets_user
  ON pomodoro_presets(user_created, created_at);

CREATE TABLE IF NOT EXISTS tasks (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  notes              TEXT,
  priority           INTEGER DEFAULT 2,
  estimated_mins     INTEGER,
  due_date           INTEGER,
  completed_at       INTEGER,
  created_at         INTEGER NOT NULL,
  habit_id           TEXT,
  temptation_bundle  TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);

CREATE TABLE IF NOT EXISTS journal_entries (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  date            INTEGER NOT NULL,
  intentions      TEXT,
  wins            TEXT,
  gratitude       TEXT,
  energy_level    INTEGER,
  mood_emoji      TEXT,
  reflection      TEXT,
  tomorrow_prep   TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date, type);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

const ENERGY_SCHEMA = `
CREATE TABLE IF NOT EXISTS energy_logs (
  id        TEXT PRIMARY KEY,
  logged_at INTEGER NOT NULL,
  energy    INTEGER NOT NULL,
  mood      INTEGER NOT NULL,
  note      TEXT,
  context   TEXT DEFAULT 'work'
);
CREATE INDEX IF NOT EXISTS idx_energy_time ON energy_logs(logged_at);
`

const BADGES_SCHEMA = `
CREATE TABLE IF NOT EXISTS badges (
  id          TEXT PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  rarity      TEXT DEFAULT 'common',
  icon        TEXT DEFAULT '🏅',
  unlocked_at INTEGER,
  xp_value    INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS xp_log (
  id        TEXT PRIMARY KEY,
  source    TEXT NOT NULL,
  source_id TEXT,
  amount    INTEGER NOT NULL,
  logged_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_xp_time ON xp_log(logged_at);

CREATE TABLE IF NOT EXISTS boss_battles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  week_start  INTEGER NOT NULL,
  max_hp      INTEGER NOT NULL DEFAULT 500,
  current_hp  INTEGER NOT NULL DEFAULT 500,
  defeated    INTEGER NOT NULL DEFAULT 0,
  loot_tier   TEXT DEFAULT 'epic'
);

CREATE TABLE IF NOT EXISTS daily_quests (
  id          TEXT PRIMARY KEY,
  date        INTEGER NOT NULL,
  quest_type  TEXT NOT NULL,
  description TEXT NOT NULL,
  target      INTEGER NOT NULL DEFAULT 1,
  progress    INTEGER NOT NULL DEFAULT 0,
  completed   INTEGER NOT NULL DEFAULT 0,
  xp_reward   INTEGER NOT NULL DEFAULT 50
);
CREATE INDEX IF NOT EXISTS idx_quests_date ON daily_quests(date);

CREATE TABLE IF NOT EXISTS loot_inventory (
  id        TEXT PRIMARY KEY,
  type      TEXT NOT NULL,
  tier      TEXT NOT NULL DEFAULT 'common',
  payload   TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  used_at   INTEGER
);
`

const BADGE_DEFINITIONS = [
  // Streak badges
  { code: 'streak_3', name: '3-Day Streak', description: 'Maintain a 3-day habit streak', rarity: 'common', icon: '🔥', xp_value: 30 },
  { code: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day habit streak', rarity: 'uncommon', icon: '⚔️', xp_value: 100 },
  { code: 'streak_14', name: 'Fortnight Focus', description: 'Maintain a 14-day streak', rarity: 'uncommon', icon: '🗡️', xp_value: 150 },
  { code: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', rarity: 'rare', icon: '💎', xp_value: 300 },
  { code: 'streak_66', name: 'Habit Formed', description: '66-day streak — habit is now automatic!', rarity: 'epic', icon: '🧠', xp_value: 600 },
  { code: 'streak_100', name: 'Centurion', description: 'Maintain a 100-day streak', rarity: 'epic', icon: '🏆', xp_value: 1000 },
  { code: 'streak_365', name: 'Legendary Grind', description: 'One full year of consistency', rarity: 'legendary', icon: '👑', xp_value: 5000 },
  // Pomodoro badges
  { code: 'pomodoro_1', name: 'First Focus', description: 'Complete your first Pomodoro session', rarity: 'common', icon: '🍅', xp_value: 20 },
  { code: 'pomodoro_10', name: 'Focused Mind', description: 'Complete 10 Pomodoro sessions', rarity: 'common', icon: '⏱️', xp_value: 50 },
  { code: 'pomodoro_50', name: 'Deep Worker', description: 'Complete 50 sessions', rarity: 'uncommon', icon: '🎯', xp_value: 150 },
  { code: 'pomodoro_100', name: 'Pomodoro Master', description: 'Complete 100 sessions', rarity: 'rare', icon: '⚡', xp_value: 400 },
  { code: 'pomodoro_500', name: 'Clockwork Mind', description: 'Complete 500 sessions', rarity: 'epic', icon: '🕰️', xp_value: 1500 },
  // Habit badges
  { code: 'first_habit', name: 'Fresh Start', description: 'Create your first habit', rarity: 'common', icon: '🌱', xp_value: 20 },
  { code: 'habit_5', name: 'Habit Builder', description: 'Track 5 different habits', rarity: 'uncommon', icon: '🏗️', xp_value: 100 },
  { code: 'perfect_day', name: 'Perfect Day', description: 'Complete all habits + 1 pomodoro + journal in one day', rarity: 'rare', icon: '✨', xp_value: 200 },
  { code: 'perfect_week', name: 'Perfect Week', description: '5 perfect days in a row', rarity: 'epic', icon: '🌟', xp_value: 750 },
  // Journal badges
  { code: 'first_ritual', name: 'Morning Person', description: 'Complete your first morning ritual', rarity: 'common', icon: '🌅', xp_value: 25 },
  { code: 'early_bird', name: 'Early Bird', description: 'Morning ritual before 7am, 3 days in a row', rarity: 'uncommon', icon: '🐦', xp_value: 120 },
  { code: 'night_owl', name: 'Night Owl', description: 'Evening reflection after 11pm', rarity: 'uncommon', icon: '🦉', xp_value: 80 },
  { code: 'journaler_7', name: 'Consistent Scribe', description: 'Journal 7 days in a row', rarity: 'uncommon', icon: '📔', xp_value: 150 },
  // Tasks badges
  { code: 'task_first', name: 'Getting Started', description: 'Complete your first task', rarity: 'common', icon: '✅', xp_value: 15 },
  { code: 'task_speed_runner', name: 'Speed Runner', description: 'Complete 10 tasks in one day', rarity: 'rare', icon: '💨', xp_value: 250 },
  { code: 'two_min_master', name: 'Two-Minute Hero', description: 'Complete 20 two-minute tasks', rarity: 'uncommon', icon: '⚡', xp_value: 100 },
  // Energy badges
  { code: 'energy_tracker', name: 'Energy Aware', description: 'Log energy 7 days in a row', rarity: 'uncommon', icon: '⚡', xp_value: 120 },
  // Boss badges
  { code: 'boss_slayer_1', name: 'Boss Slayer', description: 'Defeat your first weekly boss', rarity: 'rare', icon: '🗡️', xp_value: 300 },
  { code: 'boss_slayer_5', name: 'Monster Hunter', description: 'Defeat 5 weekly bosses', rarity: 'epic', icon: '🏹', xp_value: 800 },
  // Hidden/secret badges
  { code: 'secret_midnight', name: '???', description: 'A mysterious achievement...', rarity: 'epic', icon: '🌑', xp_value: 500 },
  { code: 'secret_novelist', name: '???', description: 'A mysterious achievement...', rarity: 'rare', icon: '📚', xp_value: 300 },
  { code: 'secret_consistent', name: '???', description: 'A mysterious achievement...', rarity: 'legendary', icon: '🌌', xp_value: 2000 }
]

const PETS_SCHEMA = `
CREATE TABLE IF NOT EXISTS pet_definitions (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL,
  rarity          TEXT NOT NULL,
  boosted_source  TEXT,
  bonus_rate      REAL NOT NULL,
  flavor_text     TEXT,
  max_level       INTEGER NOT NULL DEFAULT 20
);

CREATE TABLE IF NOT EXISTS pet_eggs (
  id              TEXT PRIMARY KEY,
  tier            TEXT NOT NULL,
  source_quest_id TEXT,
  earned_at       INTEGER NOT NULL,
  hatched_at      INTEGER,
  pet_id          TEXT REFERENCES pet_definitions(id)
);
CREATE INDEX IF NOT EXISTS idx_eggs_earned ON pet_eggs(earned_at);

CREATE TABLE IF NOT EXISTS pets (
  id              TEXT PRIMARY KEY,
  definition_id   TEXT NOT NULL REFERENCES pet_definitions(id),
  egg_id          TEXT REFERENCES pet_eggs(id),
  name            TEXT NOT NULL,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  obtained_at     INTEGER NOT NULL,
  equipped        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pets_equipped ON pets(equipped);

CREATE TABLE IF NOT EXISTS pet_xp_log (
  id              TEXT PRIMARY KEY,
  pet_id          TEXT NOT NULL REFERENCES pets(id),
  source          TEXT NOT NULL,
  source_xp       INTEGER NOT NULL,
  pet_xp_gain     INTEGER NOT NULL,
  logged_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pet_xp_time ON pet_xp_log(logged_at);
`

function seedBadges(): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO badges (id, code, name, description, rarity, icon, xp_value)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction(() => {
    for (const badge of BADGE_DEFINITIONS) {
      stmt.run(
        `badge_${badge.code}`,
        badge.code,
        badge.name,
        badge.description,
        badge.rarity,
        badge.icon,
        badge.xp_value
      )
    }
  })

  insertMany()
}

function seedPetDefinitions(): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO pet_definitions (id, name, icon, rarity, boosted_source, bonus_rate, flavor_text, max_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction(() => {
    for (const def of ALL_PET_DEFINITIONS) {
      stmt.run(
        def.id,
        def.name,
        def.icon,
        def.rarity,
        def.boostedSource ?? null,
        def.bonusRate,
        def.flavorText,
        def.maxLevel
      )
    }
  })

  insertMany()
}
