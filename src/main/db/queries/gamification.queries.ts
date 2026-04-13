import Database from 'better-sqlite3'
import { startOfDay, endOfDay, startOfWeek } from 'date-fns'

export function addXP(
  db: Database.Database,
  source: string,
  sourceId: string,
  amount: number
): void {
  const id = `xp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  db.prepare(`
    INSERT INTO xp_log (id, source, source_id, amount, logged_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, source, sourceId, amount, Date.now())
}

export function getTotalXP(db: Database.Database): number {
  const result = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log')
    .get() as { total: number }
  return result.total
}

export function unlockBadge(db: Database.Database, code: string): { unlocked: boolean; badge: { code: string; name: string; icon: string; rarity: string; xp_value: number } | null } {
  const badge = db.prepare('SELECT * FROM badges WHERE code = ?').get(code) as {
    id: string
    code: string
    name: string
    icon: string
    rarity: string
    xp_value: number
    unlocked_at: number | null
  } | undefined

  if (!badge) return { unlocked: false, badge: null }
  if (badge.unlocked_at) return { unlocked: false, badge: null } // Already unlocked

  db.prepare('UPDATE badges SET unlocked_at = ? WHERE code = ?').run(Date.now(), code)

  // Award XP for the badge
  addXP(db, 'badge', badge.id, badge.xp_value)

  return { unlocked: true, badge: { code: badge.code, name: badge.name, icon: badge.icon, rarity: badge.rarity, xp_value: badge.xp_value } }
}

export function getBadges(db: Database.Database): Array<{
  code: string; name: string; description: string; icon: string; rarity: string; xp_value: number; unlocked_at: number | null
}> {
  return db.prepare('SELECT code, name, description, icon, rarity, xp_value, unlocked_at FROM badges ORDER BY unlocked_at DESC NULLS LAST').all() as Array<{
    code: string; name: string; description: string; icon: string; rarity: string; xp_value: number; unlocked_at: number | null
  }>
}

export function getOrCreateWeeklyBoss(db: Database.Database): {
  id: string; name: string; week_start: number; max_hp: number; current_hp: number; defeated: number; loot_tier: string
} {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()

  const existing = db.prepare('SELECT * FROM boss_battles WHERE week_start = ?').get(weekStart) as {
    id: string; name: string; week_start: number; max_hp: number; current_hp: number; defeated: number; loot_tier: string
  } | undefined

  if (existing) return existing

  const bosses = [
    { name: 'The Procrastination Dragon', hp: 500 },
    { name: 'The Distraction Demon', hp: 450 },
    { name: 'The Comfort Zone Golem', hp: 550 },
    { name: 'The Overwhelm Hydra', hp: 480 },
    { name: 'The Doomscroll Wraith', hp: 520 }
  ]

  const boss = bosses[Math.floor(Math.random() * bosses.length)]
  const id = `boss_${Date.now()}`

  db.prepare(`
    INSERT INTO boss_battles (id, name, week_start, max_hp, current_hp, defeated, loot_tier)
    VALUES (?, ?, ?, ?, ?, 0, 'epic')
  `).run(id, boss.name, weekStart, boss.hp, boss.hp)

  return db.prepare('SELECT * FROM boss_battles WHERE id = ?').get(id) as {
    id: string; name: string; week_start: number; max_hp: number; current_hp: number; defeated: number; loot_tier: string
  }
}

export function damageBoss(db: Database.Database, damage: number): { current_hp: number; defeated: boolean } {
  const boss = getOrCreateWeeklyBoss(db)

  if (boss.defeated) return { current_hp: 0, defeated: true }

  const newHp = Math.max(0, boss.current_hp - damage)
  const defeated = newHp === 0

  db.prepare('UPDATE boss_battles SET current_hp = ?, defeated = ? WHERE id = ?').run(
    newHp,
    defeated ? 1 : 0,
    boss.id
  )

  return { current_hp: newHp, defeated }
}

export function getOrCreateDailyQuests(db: Database.Database): Array<{
  id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number
}> {
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  const existing = db
    .prepare('SELECT * FROM daily_quests WHERE date >= ? AND date <= ?')
    .all(todayStart, todayEnd) as Array<{ id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number }>

  if (existing.length >= 3) return existing

  // Generate 3 quests
  const questPool = [
    { type: 'pomodoros', description: 'Complete 3 Pomodoros', target: 3, xp: 75 },
    { type: 'pomodoros_morning', description: 'Complete 2 Pomodoros before noon', target: 2, xp: 80 },
    { type: 'habits_all', description: 'Check off all habits', target: 1, xp: 60 },
    { type: 'energy_logs', description: 'Log your energy 4 times today', target: 4, xp: 50 },
    { type: 'tasks', description: 'Complete 5 tasks', target: 5, xp: 60 },
    { type: 'morning_ritual', description: 'Complete your morning ritual', target: 1, xp: 40 },
    { type: 'evening_ritual', description: 'Complete your evening reflection', target: 1, xp: 40 },
    { type: 'two_min_tasks', description: 'Complete 3 two-minute tasks', target: 3, xp: 45 }
  ]

  const shuffled = questPool.sort(() => Math.random() - 0.5).slice(0, 3)

  for (const q of shuffled) {
    const id = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    db.prepare(`
      INSERT INTO daily_quests (id, date, quest_type, description, target, progress, completed, xp_reward)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    `).run(id, Date.now(), q.type, q.description, q.target, q.xp)
  }

  return db
    .prepare('SELECT * FROM daily_quests WHERE date >= ? AND date <= ?')
    .all(todayStart, todayEnd) as Array<{ id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number }>
}

export function updateQuestProgress(db: Database.Database, questId: string, progress: number): void {
  const quest = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as { target: number; completed: number } | undefined
  if (!quest || quest.completed) return

  const completed = progress >= quest.target ? 1 : 0
  db.prepare('UPDATE daily_quests SET progress = ?, completed = ? WHERE id = ?').run(
    progress,
    completed,
    questId
  )
}
