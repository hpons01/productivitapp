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
  ensureQuestLifecycleSchema()
  ensurePomodoroPresets()
  ensureCatalogSchema()
  ensureDefaultSettings()
  seedBadges()
  seedPetDefinitions()
  seedCatalogQuests()
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

function ensureQuestLifecycleSchema(): void {
  const tableInfo = db.prepare('PRAGMA table_info(daily_quests)').all() as Array<{ name: string }>
  const columns = new Set(tableInfo.map((c) => c.name))

  if (!columns.has('status')) {
    db.exec("ALTER TABLE daily_quests ADD COLUMN status TEXT NOT NULL DEFAULT 'available'")
  }
  if (!columns.has('time_window_type')) {
    db.exec("ALTER TABLE daily_quests ADD COLUMN time_window_type TEXT NOT NULL DEFAULT 'daily'")
  }
  if (!columns.has('enrolled_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN enrolled_at INTEGER')
  }
  if (!columns.has('started_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN started_at INTEGER')
  }
  if (!columns.has('deadline_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN deadline_at INTEGER')
  }
  if (!columns.has('completed_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN completed_at INTEGER')
  }
  if (!columns.has('failed_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN failed_at INTEGER')
  }
  if (!columns.has('abandoned_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN abandoned_at INTEGER')
  }
  if (!columns.has('milestones_awarded')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN milestones_awarded INTEGER NOT NULL DEFAULT 0')
  }
  if (!columns.has('reward_xp_awarded')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN reward_xp_awarded INTEGER NOT NULL DEFAULT 0')
  }
  if (!columns.has('sanction_xp')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN sanction_xp INTEGER NOT NULL DEFAULT 0')
  }
  if (!columns.has('updated_at')) {
    db.exec('ALTER TABLE daily_quests ADD COLUMN updated_at INTEGER')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS quest_enrollments (
      id                TEXT PRIMARY KEY,
      quest_id          TEXT NOT NULL UNIQUE REFERENCES daily_quests(id) ON DELETE CASCADE,
      status            TEXT NOT NULL,
      time_window_type  TEXT NOT NULL,
      enrolled_at       INTEGER NOT NULL,
      started_at        INTEGER NOT NULL,
      deadline_at       INTEGER NOT NULL,
      completed_at      INTEGER,
      failed_at         INTEGER,
      abandoned_at      INTEGER,
      last_progress_at  INTEGER,
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quest_enrollments_status_deadline
      ON quest_enrollments(status, deadline_at);

    CREATE TABLE IF NOT EXISTS quest_outcomes (
      id               TEXT PRIMARY KEY,
      quest_id         TEXT NOT NULL REFERENCES daily_quests(id) ON DELETE CASCADE,
      outcome_type     TEXT NOT NULL,
      milestone_index  INTEGER NOT NULL DEFAULT -1,
      xp_delta         INTEGER NOT NULL DEFAULT 0,
      recorded_at      INTEGER NOT NULL,
      metadata         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_quest_outcomes_quest_time
      ON quest_outcomes(quest_id, recorded_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_outcomes_unique
      ON quest_outcomes(quest_id, outcome_type, milestone_index);
  `)
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

function ensureCatalogSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS quest_definitions (
      id                 TEXT PRIMARY KEY,
      slug               TEXT NOT NULL UNIQUE,
      title              TEXT NOT NULL,
      description        TEXT NOT NULL,
      flavor_text        TEXT,
      category           TEXT NOT NULL,
      difficulty         TEXT NOT NULL,
      target_type        TEXT NOT NULL,
      target_count       INTEGER NOT NULL DEFAULT 1,
      xp_reward          INTEGER NOT NULL,
      duration_days      INTEGER NOT NULL DEFAULT 1,
      min_level_required INTEGER NOT NULL DEFAULT 1,
      max_level_visible  INTEGER,
      egg_reward_tier    TEXT,
      loot_reward_tier   TEXT,
      is_active          INTEGER NOT NULL DEFAULT 1,
      sort_order         INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_quest_def_category
      ON quest_definitions(category, difficulty);

    CREATE INDEX IF NOT EXISTS idx_quest_def_level
      ON quest_definitions(min_level_required);

    CREATE TABLE IF NOT EXISTS catalog_enrollments (
      id                  TEXT PRIMARY KEY,
      definition_id       TEXT NOT NULL REFERENCES quest_definitions(id),
      status              TEXT NOT NULL DEFAULT 'enrolled',
      progress            INTEGER NOT NULL DEFAULT 0,
      milestones_awarded  INTEGER NOT NULL DEFAULT 0,
      reward_xp_awarded   INTEGER NOT NULL DEFAULT 0,
      sanction_xp         INTEGER NOT NULL DEFAULT 0,
      enrolled_at         INTEGER NOT NULL,
      deadline_at         INTEGER NOT NULL,
      completed_at        INTEGER,
      failed_at           INTEGER,
      abandoned_at        INTEGER,
      last_progress_at    INTEGER,
      updated_at          INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_enroll_active
      ON catalog_enrollments(definition_id)
      WHERE status IN ('enrolled', 'active');

    CREATE INDEX IF NOT EXISTS idx_catalog_enroll_status
      ON catalog_enrollments(status);

    CREATE INDEX IF NOT EXISTS idx_catalog_enroll_deadline
      ON catalog_enrollments(deadline_at, status);
  `)
}

const CATALOG_QUEST_DEFINITIONS = [
  // ── EASY (duration_days 1-3, xp 30-50, level 1) ──
  { slug: 'first_blood',       title: 'First Blood',       description: 'Complete 1 Pomodoro',                    flavor_text: 'Every legend starts with a single step.',            category: 'focus',       difficulty: 'easy',      target_type: 'pomodoros',      target_count: 1,   xp_reward: 30,   duration_days: 1,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 10 },
  { slug: 'quick_start',       title: 'Quick Start',       description: 'Complete 3 tasks',                       flavor_text: 'Momentum starts with the first check.',              category: 'discipline',  difficulty: 'easy',      target_type: 'tasks',          target_count: 3,   xp_reward: 35,   duration_days: 1,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 20 },
  { slug: 'morning_person',    title: 'Morning Person',    description: 'Complete morning ritual 3 times',        flavor_text: 'The morning belongs to those who show up.',          category: 'reflection',  difficulty: 'easy',      target_type: 'morning_ritual', target_count: 3,   xp_reward: 40,   duration_days: 3,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 30 },
  { slug: 'quick_wins',        title: 'Quick Wins',        description: 'Complete 5 two-minute tasks',            flavor_text: 'Momentum is built from small victories.',            category: 'discipline',  difficulty: 'easy',      target_type: 'two_min_tasks',  target_count: 5,   xp_reward: 35,   duration_days: 2,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 40 },
  { slug: 'energy_scout',      title: 'Energy Scout',      description: 'Log your energy 3 times',               flavor_text: "You can't manage what you don't measure.",           category: 'vitality',    difficulty: 'easy',      target_type: 'energy_logs',    target_count: 3,   xp_reward: 30,   duration_days: 2,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 50 },
  { slug: 'habit_seed',        title: 'Habit Seed',        description: 'Complete all habits 3 times',           flavor_text: 'A seed planted is a future harvested.',              category: 'discipline',  difficulty: 'easy',      target_type: 'habits_all',     target_count: 3,   xp_reward: 50,   duration_days: 3,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 60 },
  { slug: 'task_starter',      title: 'Task Starter',      description: 'Complete 10 tasks',                     flavor_text: 'The hardest part is starting.',                      category: 'discipline',  difficulty: 'easy',      target_type: 'tasks',          target_count: 10,  xp_reward: 40,   duration_days: 3,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 70 },
  { slug: 'evening_closer',    title: 'Evening Closer',    description: 'Complete evening reflection 3 times',   flavor_text: 'End each day with intention.',                       category: 'reflection',  difficulty: 'easy',      target_type: 'evening_ritual', target_count: 3,   xp_reward: 40,   duration_days: 3,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 80 },
  { slug: 'focus_spark',       title: 'Focus Spark',       description: 'Complete 3 Pomodoros',                  flavor_text: 'Three fires lit. The habit begins.',                 category: 'focus',       difficulty: 'easy',      target_type: 'pomodoros',      target_count: 3,   xp_reward: 35,   duration_days: 2,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 90 },
  { slug: 'energy_check',      title: 'Energy Check',      description: 'Log your energy 5 times',               flavor_text: 'Self-awareness is the first step to mastery.',       category: 'vitality',    difficulty: 'easy',      target_type: 'energy_logs',    target_count: 5,   xp_reward: 40,   duration_days: 3,  min_level_required: 1,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 100 },
  // ── MEDIUM (duration_days 3-7, xp 100-170, level 3-7) ──
  { slug: 'week_warrior',      title: 'Week Warrior',      description: 'Complete 15 Pomodoros',                 flavor_text: 'Deep work compounds like interest.',                 category: 'focus',       difficulty: 'medium',    target_type: 'pomodoros',      target_count: 15,  xp_reward: 120,  duration_days: 7,  min_level_required: 3,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 110 },
  { slug: 'ritual_master',     title: 'Ritual Master',     description: 'Complete morning ritual 5 times',       flavor_text: 'Rituals are the scaffolding of great lives.',        category: 'reflection',  difficulty: 'medium',    target_type: 'morning_ritual', target_count: 5,   xp_reward: 100,  duration_days: 7,  min_level_required: 3,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 120 },
  { slug: 'task_blitz',        title: 'Task Blitz',        description: 'Complete 25 tasks',                     flavor_text: 'Execution separates dreamers from doers.',           category: 'discipline',  difficulty: 'medium',    target_type: 'tasks',          target_count: 25,  xp_reward: 130,  duration_days: 7,  min_level_required: 5,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 130 },
  { slug: 'deep_diver',        title: 'Deep Diver',        description: 'Complete 3 zero-interruption Pomodoros',flavor_text: 'Flow state is where mastery is forged.',             category: 'focus',       difficulty: 'medium',    target_type: 'deep_focus_day', target_count: 3,   xp_reward: 150,  duration_days: 5,  min_level_required: 5,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 140 },
  { slug: 'energy_sage',       title: 'Energy Sage',       description: 'Log your energy 14 times',              flavor_text: 'Awareness of self is the first form of mastery.',   category: 'vitality',    difficulty: 'medium',    target_type: 'energy_logs',    target_count: 14,  xp_reward: 110,  duration_days: 7,  min_level_required: 5,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 150 },
  { slug: 'habit_chain',       title: 'Habit Chain',       description: 'Complete all habits 7 times',           flavor_text: "Chains of habit are too light to feel until they're too heavy to break.", category: 'discipline', difficulty: 'medium', target_type: 'habits_all', target_count: 7, xp_reward: 160, duration_days: 7, min_level_required: 7, egg_reward_tier: null, loot_reward_tier: null, sort_order: 160 },
  { slug: 'evening_sage',      title: 'Evening Sage',      description: 'Complete evening reflection 7 times',   flavor_text: 'Reflection is the engine of improvement.',          category: 'reflection',  difficulty: 'medium',    target_type: 'evening_ritual', target_count: 7,   xp_reward: 120,  duration_days: 7,  min_level_required: 5,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 170 },
  { slug: 'two_min_master',    title: 'Two-Minute Master', description: 'Complete 20 two-minute tasks',          flavor_text: 'If it takes less than two minutes, do it now.',     category: 'discipline',  difficulty: 'medium',    target_type: 'two_min_tasks',  target_count: 20,  xp_reward: 140,  duration_days: 5,  min_level_required: 3,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 180 },
  { slug: 'blitz_sprint',      title: 'Blitz Sprint',      description: 'Complete 10 tasks in 3 days',           flavor_text: 'Speed and focus together are unstoppable.',         category: 'discipline',  difficulty: 'medium',    target_type: 'tasks',          target_count: 10,  xp_reward: 110,  duration_days: 3,  min_level_required: 3,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 190 },
  { slug: 'focus_block',       title: 'Focus Block',       description: 'Complete 8 Pomodoros in 3 days',        flavor_text: 'Eight sessions. Eight victories. One character.',    category: 'focus',       difficulty: 'medium',    target_type: 'pomodoros',      target_count: 8,   xp_reward: 130,  duration_days: 3,  min_level_required: 5,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 200 },
  { slug: 'reflection_week',   title: 'Reflection Week',   description: 'Complete evening reflection 5 times',   flavor_text: 'Examine what you endure. Endure what you become.',  category: 'reflection',  difficulty: 'medium',    target_type: 'evening_ritual', target_count: 5,   xp_reward: 115,  duration_days: 5,  min_level_required: 3,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 210 },
  { slug: 'vitality_tracker',  title: 'Vitality Tracker',  description: 'Log your energy 10 times',              flavor_text: 'The body keeps the score. Make sure you listen.',   category: 'vitality',    difficulty: 'medium',    target_type: 'energy_logs',    target_count: 10,  xp_reward: 105,  duration_days: 5,  min_level_required: 3,  egg_reward_tier: null, loot_reward_tier: null, sort_order: 220 },
  // ── HARD (duration_days 5-14, xp 260-450, level 8-12) ──
  { slug: 'pomodoro_knight',   title: 'Pomodoro Knight',   description: 'Complete 50 Pomodoros',                 flavor_text: 'A thousand hours of focused work changes who you are.', category: 'focus',    difficulty: 'hard',      target_type: 'pomodoros',      target_count: 50,  xp_reward: 350,  duration_days: 14, min_level_required: 8,  egg_reward_tier: 'mystery', loot_reward_tier: null,    sort_order: 310 },
  { slug: 'iron_discipline',   title: 'Iron Discipline',   description: 'Complete all habits 14 times',          flavor_text: 'Discipline is the bridge between goals and accomplishment.', category: 'discipline', difficulty: 'hard', target_type: 'habits_all', target_count: 14, xp_reward: 300, duration_days: 14, min_level_required: 8, egg_reward_tier: 'mystery', loot_reward_tier: null, sort_order: 320 },
  { slug: 'philosophers_day',  title: "Philosopher's Day", description: 'Complete morning ritual 10 times',      flavor_text: 'The examined life is the only one worth living.',    category: 'mastery',     difficulty: 'hard',      target_type: 'morning_ritual', target_count: 10,  xp_reward: 320,  duration_days: 10, min_level_required: 10, egg_reward_tier: null,      loot_reward_tier: 'rare',  sort_order: 330 },
  { slug: 'night_writer',      title: 'Night Writer',      description: 'Complete evening reflection 10 times',  flavor_text: 'Every evening ended with wisdom is a victory.',     category: 'reflection',  difficulty: 'hard',      target_type: 'evening_ritual', target_count: 10,  xp_reward: 280,  duration_days: 10, min_level_required: 10, egg_reward_tier: null,      loot_reward_tier: null,    sort_order: 340 },
  { slug: 'marathon_runner',   title: 'Marathon Runner',   description: 'Complete 100 tasks',                    flavor_text: 'Endurance is the mother of mastery.',                category: 'discipline',  difficulty: 'hard',      target_type: 'tasks',          target_count: 100, xp_reward: 400,  duration_days: 14, min_level_required: 12, egg_reward_tier: null,      loot_reward_tier: 'rare',  sort_order: 350 },
  { slug: 'task_centurion',    title: 'Task Centurion',    description: 'Complete 75 tasks',                     flavor_text: 'Action is the foundational key to all success.',    category: 'discipline',  difficulty: 'hard',      target_type: 'tasks',          target_count: 75,  xp_reward: 350,  duration_days: 14, min_level_required: 10, egg_reward_tier: null,      loot_reward_tier: null,    sort_order: 360 },
  { slug: 'deep_focus_master', title: 'Deep Focus Master', description: 'Complete 10 zero-interruption Pomodoros',flavor_text: 'The ability to focus is a superpower.',            category: 'focus',       difficulty: 'hard',      target_type: 'deep_focus_day', target_count: 10,  xp_reward: 380,  duration_days: 7,  min_level_required: 8,  egg_reward_tier: 'mystery', loot_reward_tier: null,    sort_order: 370 },
  { slug: 'ritual_keeper',     title: 'Ritual Keeper',     description: 'Complete morning ritual 15 times',      flavor_text: 'Consistent rituals are the backbone of great men.',  category: 'reflection',  difficulty: 'hard',      target_type: 'morning_ritual', target_count: 15,  xp_reward: 310,  duration_days: 14, min_level_required: 9,  egg_reward_tier: null,      loot_reward_tier: 'common', sort_order: 380 },
  { slug: 'energy_master',     title: 'Energy Master',     description: 'Log your energy 30 times',              flavor_text: 'Mastering energy is mastering life itself.',        category: 'vitality',    difficulty: 'hard',      target_type: 'energy_logs',    target_count: 30,  xp_reward: 290,  duration_days: 14, min_level_required: 8,  egg_reward_tier: null,      loot_reward_tier: null,    sort_order: 390 },
  { slug: 'pressure_cooker',   title: 'Pressure Cooker',   description: 'Complete 20 Pomodoros in 5 days',       flavor_text: 'Pressure forges diamonds.',                          category: 'focus',       difficulty: 'hard',      target_type: 'pomodoros',      target_count: 20,  xp_reward: 320,  duration_days: 5,  min_level_required: 8,  egg_reward_tier: null,      loot_reward_tier: null,    sort_order: 400 },
  { slug: 'habit_forge',       title: 'Habit Forge',       description: 'Complete all habits 10 times',          flavor_text: 'Steel is forged in fire. So are habits.',           category: 'discipline',  difficulty: 'hard',      target_type: 'habits_all',     target_count: 10,  xp_reward: 340,  duration_days: 10, min_level_required: 9,  egg_reward_tier: 'mystery', loot_reward_tier: null,    sort_order: 410 },
  { slug: 'quick_mission',     title: 'Quick Mission',     description: 'Complete 15 two-minute tasks in 5 days',flavor_text: 'Small tasks, big discipline.',                      category: 'discipline',  difficulty: 'hard',      target_type: 'two_min_tasks',  target_count: 15,  xp_reward: 260,  duration_days: 5,  min_level_required: 8,  egg_reward_tier: null,      loot_reward_tier: null,    sort_order: 420 },
  // ── LEGENDARY (duration_days 14-30, xp 750-2500, level 15-18) ──
  { slug: 'the_unstoppable',   title: 'The Unstoppable',   description: 'Complete all habits 100 times',         flavor_text: 'You do not rise to the level of your goals. You fall to the level of your systems.', category: 'discipline', difficulty: 'legendary', target_type: 'habits_all',     target_count: 100, xp_reward: 1000, duration_days: 30, min_level_required: 15, egg_reward_tier: 'legendary', loot_reward_tier: 'epic',      sort_order: 510 },
  { slug: 'grandmaster_focus', title: 'Grandmaster Focus', description: 'Complete 200 Pomodoros',                flavor_text: 'Two hundred sessions. Two hundred battles won.',    category: 'focus',       difficulty: 'legendary', target_type: 'pomodoros',      target_count: 200, xp_reward: 1200, duration_days: 30, min_level_required: 15, egg_reward_tier: 'mystery',   loot_reward_tier: 'legendary', sort_order: 520 },
  { slug: 'ascendant',         title: 'Ascendant',         description: 'Complete morning ritual 30 times',      flavor_text: 'Thirty mornings given willingly. You have become the ritual.', category: 'mastery', difficulty: 'legendary', target_type: 'morning_ritual', target_count: 30, xp_reward: 900, duration_days: 30, min_level_required: 18, egg_reward_tier: 'legendary', loot_reward_tier: 'legendary', sort_order: 530 },
  { slug: 'the_chronicler',    title: 'The Chronicler',    description: 'Complete evening reflection 30 times',  flavor_text: 'Those who write their story, own their story.',     category: 'reflection',  difficulty: 'legendary', target_type: 'evening_ritual', target_count: 30,  xp_reward: 850,  duration_days: 30, min_level_required: 15, egg_reward_tier: null,        loot_reward_tier: 'epic',      sort_order: 540 },
  { slug: 'legendary_grind',   title: 'Legendary Grind',   description: 'Complete 100 two-minute tasks',         flavor_text: 'Five hundred fires lit. The world bends for those who endure.', category: 'legendary', difficulty: 'legendary', target_type: 'two_min_tasks', target_count: 100, xp_reward: 750, duration_days: 14, min_level_required: 18, egg_reward_tier: 'legendary', loot_reward_tier: 'legendary', sort_order: 550 },
  { slug: 'energy_transcendent',title: 'Energy Transcendent',description: 'Log your energy 100 times',           flavor_text: 'Self-knowledge is the highest knowledge.',          category: 'vitality',    difficulty: 'legendary', target_type: 'energy_logs',    target_count: 100, xp_reward: 750,  duration_days: 30, min_level_required: 15, egg_reward_tier: null,        loot_reward_tier: 'rare',      sort_order: 560 },
  { slug: 'the_blitz_legend',  title: 'The Blitz Legend',  description: 'Complete 300 tasks',                    flavor_text: 'Action upon action upon action. This is how legends are built.', category: 'discipline', difficulty: 'legendary', target_type: 'tasks', target_count: 300, xp_reward: 1500, duration_days: 30, min_level_required: 18, egg_reward_tier: 'legendary', loot_reward_tier: 'epic', sort_order: 570 },
  { slug: 'iron_monk',         title: 'Iron Monk',         description: 'Complete all habits 50 times',          flavor_text: 'Discipline is not a punishment. It is a form of self-respect.', category: 'discipline', difficulty: 'legendary', target_type: 'habits_all', target_count: 50, xp_reward: 950, duration_days: 21, min_level_required: 15, egg_reward_tier: 'mystery', loot_reward_tier: 'rare', sort_order: 580 },
] as const

function seedCatalogQuests(): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO quest_definitions
      (id, slug, title, description, flavor_text, category, difficulty,
       target_type, target_count, xp_reward, duration_days, min_level_required,
       max_level_visible, egg_reward_tier, loot_reward_tier, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1, ?)
  `)

  const insertAll = db.transaction(() => {
    for (const q of CATALOG_QUEST_DEFINITIONS) {
      stmt.run(
        `qdef_${q.slug}`,
        q.slug,
        q.title,
        q.description,
        q.flavor_text,
        q.category,
        q.difficulty,
        q.target_type,
        q.target_count,
        q.xp_reward,
        q.duration_days,
        q.min_level_required,
        q.egg_reward_tier ?? null,
        q.loot_reward_tier ?? null,
        q.sort_order
      )
    }
  })

  insertAll()
}
