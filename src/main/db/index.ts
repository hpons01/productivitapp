import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync } from 'fs'

let db: Database.Database

export function initDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'productivitapp.db')
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
  seedBadges()
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
    { version: '003_badges', sql: BADGES_SCHEMA }
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
