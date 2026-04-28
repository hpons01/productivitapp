import Database from 'better-sqlite3'
import { startOfDay, endOfDay, startOfWeek, subDays } from 'date-fns'
import {
  CHARACTER_CLASSES,
  CHARACTER_CLASSES_BY_ID,
  CharacterClassId,
  CharacterClassDefinition,
  getEvolutionTier,
  isCharacterClassId
} from '../../domain/classes'
import { getSetting, setSetting } from './settings.queries'
import { sendNotification } from '../../notifications'
import { getEquippedPet, awardPetXP, awardEgg } from './pets.queries'
import { getPetMultiplier, ALL_PET_DEFINITIONS } from '../../domain/pets'
import { logEvent } from './eventlog.queries'
import { awardFocus } from './shop.queries'

const SELECTED_CLASS_KEY = 'selected_character_class'

export interface XpAwardResult {
  source: string
  sourceId: string
  baseAmount: number
  classMultiplier: number
  evolutionMultiplier: number
  evolutionTier: number
  multiplier: number
  finalAmount: number
  bonusAmount: number
  classIdApplied: CharacterClassId | null
  petMultiplier: number
  powerupMultiplier: number
  petXpGain: number
  petLeveledUp: boolean
  equippedPetId: string | null
  levelBefore: number
  levelAfter: number
  levelUpFocusAwarded: number
}

const LEVEL_UP_FOCUS_REWARD = 10

interface ActivePowerupConfig {
  type: string
  multiplier: number
  expires_at: number | null
  uses_left: number | null
}

function levelFromTotalXP(totalXP: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXP / 10)))
}

function focusForLevel(level: number): number {
  // Keep level-up Focus predictable so players can plan purchases.
  return level >= 2 ? LEVEL_UP_FOCUS_REWARD : 0
}

function dequeueNextPowerup(db: Database.Database): ActivePowerupConfig | null {
  const queueRaw = getSetting(db, 'powerup_queue')
  if (!queueRaw) return null
  try {
    const queue = JSON.parse(queueRaw) as ActivePowerupConfig[]
    if (!Array.isArray(queue) || queue.length === 0) return null
    const [next, ...rest] = queue
    setSetting(db, 'powerup_queue', JSON.stringify(rest))
    return next
  } catch {
    return null
  }
}

function getXpPowerupMultiplier(db: Database.Database, source: string): number {
  const raw = getSetting(db, 'active_powerup')
  if (!raw) return 1

  let pu: ActivePowerupConfig
  try {
    pu = JSON.parse(raw) as ActivePowerupConfig
  } catch {
    return 1
  }

  const hasMultiplier = typeof pu.multiplier === 'number' && Number.isFinite(pu.multiplier)
  if (!hasMultiplier || pu.multiplier <= 1) {
    const next = dequeueNextPowerup(db)
    if (next) setSetting(db, 'active_powerup', JSON.stringify(next))
    return 1
  }

  const now = Date.now()
  const expired = pu.expires_at !== null && now > pu.expires_at
  const depleted = pu.uses_left !== null && pu.uses_left <= 0
  if (expired || depleted) {
    const next = dequeueNextPowerup(db)
    if (next) setSetting(db, 'active_powerup', JSON.stringify(next))
    return 1
  }

  const appliesToSource =
    pu.type === 'focus_potion'
      ? source === 'pomodoro'
      : pu.type === 'habit_boost'
        ? source === 'habit'
        : ['double_xp', 'time_warp', 'xp_boost'].includes(pu.type)

  if (!appliesToSource) return 1

  if (pu.uses_left !== null) {
    const usesLeft = Math.max(0, pu.uses_left - 1)
    setSetting(db, 'active_powerup', JSON.stringify({ ...pu, uses_left: usesLeft }))
  }

  return pu.multiplier
}

export interface CharacterClassConfig {
  selectedClassId: CharacterClassId
  classes: CharacterClassDefinition[]
}

export function getSelectedCharacterClassId(db: Database.Database): CharacterClassId {
  const raw = getSetting(db, SELECTED_CLASS_KEY)
  if (raw && isCharacterClassId(raw)) return raw
  setSetting(db, SELECTED_CLASS_KEY, 'apprentice')
  return 'apprentice'
}

export function setSelectedCharacterClassId(db: Database.Database, classId: string): CharacterClassId {
  if (!isCharacterClassId(classId)) {
    throw new Error(`Invalid class id: ${classId}`)
  }
  setSetting(db, SELECTED_CLASS_KEY, classId)
  return classId
}

export function getCharacterClassConfig(db: Database.Database): CharacterClassConfig {
  return {
    selectedClassId: getSelectedCharacterClassId(db),
    classes: CHARACTER_CLASSES
  }
}

export function awardXP(
  db: Database.Database,
  source: string,
  sourceId: string,
  baseAmount: number
): XpAwardResult {
  const id = `xp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const selectedClassId = getSelectedCharacterClassId(db)
  const classDef = CHARACTER_CLASSES_BY_ID[selectedClassId]
  const sourceGetsClassBonus = classDef.boostedSource === source

  const masteryResult = db.prepare(`
    SELECT COALESCE(SUM(base_amount), 0) as total
    FROM xp_log
    WHERE class_id_applied = ?
  `).get(selectedClassId) as { total: number }
  const masteryXpBefore = masteryResult.total || 0
  const evolutionTier = getEvolutionTier(classDef, masteryXpBefore)

  const classMultiplier = sourceGetsClassBonus ? classDef.multiplier : 1
  const evolutionMultiplier = sourceGetsClassBonus ? 1 + evolutionTier * 0.03 : 1
  const classCappedMultiplier = Math.min(1.5, classMultiplier * evolutionMultiplier)
  const classIdApplied = sourceGetsClassBonus ? selectedClassId : null
  const evolutionTierApplied = sourceGetsClassBonus ? evolutionTier : null

  // ── Pet bonus layer (applied after class cap) ──────────────────────────────
  let petMultiplier = 1
  let petXpGain = 0
  let petLeveledUp = false
  let equippedPetId: string | null = null

  const equippedPet = getEquippedPet(db)
  if (equippedPet) {
    equippedPetId = equippedPet.id
    const def = ALL_PET_DEFINITIONS.find((d) => d.id === equippedPet.definition_id)
    if (def) {
      petMultiplier = getPetMultiplier(def, equippedPet.level, source)
    }
    const petResult = awardPetXP(db, equippedPet.id, source, baseAmount)
    petXpGain = petResult.petXpGain
    petLeveledUp = petResult.leveledUp
  }

  const powerupMultiplier = getXpPowerupMultiplier(db, source)
  const multiplier = classCappedMultiplier * petMultiplier * powerupMultiplier
  const finalAmount = Math.max(0, Math.round(baseAmount * multiplier))
  const bonusAmount = Math.max(0, finalAmount - baseAmount)

  const totalXpBeforeRow = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log')
    .get() as { total: number }
  const totalXPBefore = totalXpBeforeRow.total || 0
  const levelBefore = levelFromTotalXP(totalXPBefore)

  db.prepare(`
    INSERT INTO xp_log (id, source, source_id, amount, base_amount, multiplier, class_id_applied, evolution_tier, logged_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, source, sourceId, finalAmount, baseAmount, multiplier, classIdApplied, evolutionTierApplied, Date.now(), Date.now())

  const totalXPAfter = totalXPBefore + finalAmount
  const levelAfter = levelFromTotalXP(totalXPAfter)
  let levelUpFocusAwarded = 0

  if (levelAfter > levelBefore) {
    for (let level = levelBefore + 1; level <= levelAfter; level += 1) {
      const focusAmount = focusForLevel(level)
      if (focusAmount <= 0) continue

      const focusSourceId = `level_up_focus_${level}`
      const alreadyAwarded = db
        .prepare("SELECT COUNT(*) as n FROM focus_log WHERE source = 'level_up' AND source_id = ?")
        .get(focusSourceId) as { n: number }

      if (alreadyAwarded.n > 0) continue

      awardFocus(db, 'level_up', focusSourceId, focusAmount)
      levelUpFocusAwarded += focusAmount
    }
  }

  logEvent(db, 'xp_awarded', source, sourceId, {
    baseAmount,
    finalAmount,
    multiplier,
    classIdApplied,
    evolutionTier,
    petMultiplier,
    petXpGain
  })

  if (sourceGetsClassBonus) {
    const masteryXpAfter = masteryXpBefore + baseAmount
    const evolutionTierAfter = getEvolutionTier(classDef, masteryXpAfter)
    if (evolutionTierAfter > evolutionTier) {
      const unlocked = classDef.evolutionPath[evolutionTierAfter]
      if (unlocked) {
        sendNotification(
          `✨ ${classDef.name} evolved: ${unlocked.title}`,
          unlocked.perk
        )
      }
    }
  }

  return {
    source,
    sourceId,
    baseAmount,
    classMultiplier,
    evolutionMultiplier,
    evolutionTier,
    multiplier,
    finalAmount,
    bonusAmount,
    classIdApplied,
    petMultiplier,
    powerupMultiplier,
    petXpGain,
    petLeveledUp,
    equippedPetId,
    levelBefore,
    levelAfter,
    levelUpFocusAwarded
  }
}

export function addXP(
  db: Database.Database,
  source: string,
  sourceId: string,
  amount: number
): void {
  awardXP(db, source, sourceId, amount)
}

export function getTotalXP(db: Database.Database): number {
  const result = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log')
    .get() as { total: number }
  return result.total
}

export function unlockBadge(db: Database.Database, code: string): { unlocked: boolean; badge: { code: string; name: string; icon: string; rarity: string; xp_value: number; focus_awarded?: number } | null } {
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

  db.prepare('UPDATE badges SET unlocked_at = ?, updated_at = ? WHERE code = ?').run(Date.now(), Date.now(), code)

  // Award XP for the badge
  awardXP(db, 'badge', badge.id, badge.xp_value)

  // Award Focus proportional to badge XP (at least 1)
  const focusAmount = Math.max(1, Math.floor(badge.xp_value / 10))
  awardFocus(db, 'badge_unlock', `badge_focus_${badge.id}`, focusAmount)

  return { unlocked: true, badge: { code: badge.code, name: badge.name, icon: badge.icon, rarity: badge.rarity, xp_value: badge.xp_value, focus_awarded: focusAmount } }
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
    INSERT INTO boss_battles (id, name, week_start, max_hp, current_hp, defeated, loot_tier, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 'epic', ?)
  `).run(id, boss.name, weekStart, boss.hp, boss.hp, Date.now())

  return db.prepare('SELECT * FROM boss_battles WHERE id = ?').get(id) as {
    id: string; name: string; week_start: number; max_hp: number; current_hp: number; defeated: number; loot_tier: string
  }
}

export function damageBoss(db: Database.Database, damage: number): { current_hp: number; defeated: boolean } {
  const boss = getOrCreateWeeklyBoss(db)

  if (boss.defeated) return { current_hp: 0, defeated: true }

  const selectedClassId = getSelectedCharacterClassId(db)
  const classDef = CHARACTER_CLASSES_BY_ID[selectedClassId]
  const masteryResult = db.prepare(`
    SELECT COALESCE(SUM(base_amount), 0) as total
    FROM xp_log
    WHERE class_id_applied = ?
  `).get(selectedClassId) as { total: number }
  const evolutionTier = getEvolutionTier(classDef, masteryResult.total || 0)
  const perkMultiplier = Math.min(1.25, 1 + evolutionTier * 0.08)
  const effectiveDamage = Math.max(1, Math.round(damage * perkMultiplier))

  const newHp = Math.max(0, boss.current_hp - effectiveDamage)
  const defeated = newHp === 0

  db.prepare('UPDATE boss_battles SET current_hp = ?, defeated = ?, updated_at = ? WHERE id = ?').run(
    newHp,
    defeated ? 1 : 0,
    Date.now(),
    boss.id
  )

  return { current_hp: newHp, defeated }
}

/**
 * Detect if any daily habit had a streak of >= 3 that broke yesterday.
 * Checks whether any active daily habit has completions on T-3, T-2, T-1
 * but NOT today — meaning the user had a streak but missed today so far.
 */
export function hasBrokenStreakToday(db: Database.Database): boolean {
  const today = startOfDay(new Date())
  const todayStart = today.getTime()
  const todayEnd = endOfDay(new Date()).getTime()
  const d1Start = startOfDay(subDays(today, 1)).getTime()
  const d1End = endOfDay(subDays(today, 1)).getTime()
  const d2Start = startOfDay(subDays(today, 2)).getTime()
  const d2End = endOfDay(subDays(today, 2)).getTime()
  const d3Start = startOfDay(subDays(today, 3)).getTime()
  const d3End = endOfDay(subDays(today, 3)).getTime()

  const habits = db
    .prepare("SELECT id FROM habits WHERE archived_at IS NULL AND deleted_at IS NULL AND frequency = 'daily'")
    .all() as Array<{ id: string }>

  for (const habit of habits) {
    const todayCount = (
      db
        .prepare(
          'SELECT COUNT(*) as n FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ?'
        )
        .get(habit.id, todayStart, todayEnd) as { n: number }
    ).n
    if (todayCount > 0) continue // Still active today — not broken

    const d1Count = (
      db
        .prepare(
          'SELECT COUNT(*) as n FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ?'
        )
        .get(habit.id, d1Start, d1End) as { n: number }
    ).n
    const d2Count = (
      db
        .prepare(
          'SELECT COUNT(*) as n FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ?'
        )
        .get(habit.id, d2Start, d2End) as { n: number }
    ).n
    const d3Count = (
      db
        .prepare(
          'SELECT COUNT(*) as n FROM habit_completions WHERE habit_id = ? AND completed_at >= ? AND completed_at <= ?'
        )
        .get(habit.id, d3Start, d3End) as { n: number }
    ).n

    if (d1Count > 0 && d2Count > 0 && d3Count > 0) {
      return true // This habit had >= 3 consecutive days ending yesterday — streak broken
    }
  }

  return false
}

/**
 * Update the streak_recovery quest progress for today based on
 * how many habits have been completed vs total active habits.
 */
export function updateStreakRecoveryQuest(db: Database.Database, completedToday: number): void {
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  const quest = db
    .prepare(
      "SELECT * FROM daily_quests WHERE quest_type = 'streak_recovery' AND date >= ? AND date <= ?"
    )
    .get(todayStart, todayEnd) as { id: string; target: number; completed: number } | undefined

  if (!quest || quest.completed) return

  updateQuestProgress(db, quest.id, completedToday)
}

export function getOrCreateDailyQuests(db: Database.Database): Array<{
  id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number
}> {
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  const existing = db
    .prepare('SELECT * FROM daily_quests WHERE date >= ? AND date <= ?')
    .all(todayStart, todayEnd) as Array<{ id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number }>

  // Separate normal quests from the special recovery quest
  const normalQuests = existing.filter((q) => q.quest_type !== 'streak_recovery')
  const hasRecoveryQuest = existing.some((q) => q.quest_type === 'streak_recovery')

  const completionWindowStart = startOfDay(subDays(new Date(), 7)).getTime()
  const recentStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as completed_count
    FROM daily_quests
    WHERE date >= ?
      AND quest_type <> 'streak_recovery'
  `).get(completionWindowStart) as { total: number; completed_count: number }
  const recentCompletionRate = recentStats.total > 0 ? recentStats.completed_count / recentStats.total : 0.65

  // Seed normal quests if we have fewer than 3
  if (normalQuests.length < 3) {
    type QuestTemplate = {
      type: string
      description: string
      target: number
      xp: number
      difficulty: 'easy' | 'medium' | 'hard'
      eggReward?: boolean
    }

    const questPool: QuestTemplate[] = [
      { type: 'pomodoros', description: 'Complete 3 Pomodoros', target: 3, xp: 75, difficulty: 'medium' },
      { type: 'pomodoros_morning', description: 'Complete 2 Pomodoros before noon', target: 2, xp: 80, difficulty: 'medium' },
      { type: 'habits_all', description: 'Check off all habits', target: 1, xp: 60, difficulty: 'easy' },
      { type: 'energy_logs', description: 'Log your energy 4 times today', target: 4, xp: 50, difficulty: 'easy' },
      { type: 'tasks', description: 'Complete 5 tasks', target: 5, xp: 60, difficulty: 'medium' },
      { type: 'morning_ritual', description: 'Complete your morning ritual', target: 1, xp: 40, difficulty: 'easy' },
      { type: 'evening_ritual', description: 'Complete your evening reflection', target: 1, xp: 40, difficulty: 'easy' },
      { type: 'two_min_tasks', description: 'Complete 3 two-minute tasks', target: 3, xp: 45, difficulty: 'easy' },
      // Egg-reward quests (always award a mystery egg on completion)
      { type: 'egg_hatch_prep', description: 'Complete 5 Pomodoros today', target: 5, xp: 100, difficulty: 'hard', eggReward: true },
      { type: 'deep_focus_day', description: 'Complete 4 Pomodoros with no interruptions', target: 4, xp: 90, difficulty: 'hard', eggReward: true },
      { type: 'egg_seeker', description: 'Check all habits, complete 2 Pomodoros, and journal today', target: 1, xp: 120, difficulty: 'hard', eggReward: true }
    ]

    let candidatePool = questPool
    if (recentCompletionRate >= 0.85) {
      candidatePool = questPool.filter((q) => q.difficulty !== 'easy')
    } else if (recentCompletionRate <= 0.5) {
      candidatePool = questPool.filter((q) => q.difficulty !== 'hard')
    }

    const needed = 3 - normalQuests.length
    const shuffled = [...candidatePool].sort(() => Math.random() - 0.5).slice(0, needed)

    if (shuffled.length < needed) {
      const missing = needed - shuffled.length
      const fallback = questPool
        .filter((q) => !shuffled.some((selected) => selected.type === q.type))
        .sort(() => Math.random() - 0.5)
        .slice(0, missing)
      shuffled.push(...fallback)
    }

    for (const q of shuffled) {
      const id = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

      // Keep quest-level egg chance, but eggs are always mystery until opened.
      const hasEggReward = q.eggReward || Math.random() < 0.25
      const eggRewardTier = hasEggReward ? 'mystery' : null

      // Assign Focus reward based on difficulty
      const focusReward =
        q.difficulty === 'hard' ? 25 :
        q.difficulty === 'medium' ? 15 :
        10

      db.prepare(`
        INSERT INTO daily_quests (id, date, quest_type, description, target, progress, completed, xp_reward, egg_reward_tier, focus_reward)
        VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `).run(id, Date.now(), q.type, q.description, q.target, q.xp, eggRewardTier, focusReward)

      db.prepare('UPDATE daily_quests SET updated_at = ? WHERE id = ?').run(Date.now(), id)
    }
  }

  // Inject streak recovery quest if a streak broke and we haven't added one yet
  if (!hasRecoveryQuest && hasBrokenStreakToday(db)) {
    const totalHabits = (
      db
        .prepare("SELECT COUNT(*) as n FROM habits WHERE archived_at IS NULL AND frequency = 'daily'")
        .get() as { n: number }
    ).n

    const id = `quest_${Date.now()}_recovery`
    db.prepare(`
      INSERT INTO daily_quests (id, date, quest_type, description, target, progress, completed, xp_reward)
      VALUES (?, ?, 'streak_recovery', ?, ?, 0, 0, 100)
    `).run(id, Date.now(), 'Complete all habits today to start your streak recovery!', totalHabits || 1)

    db.prepare('UPDATE daily_quests SET updated_at = ? WHERE id = ?').run(Date.now(), id)
  }

  return db
    .prepare('SELECT * FROM daily_quests WHERE date >= ? AND date <= ? ORDER BY quest_type DESC')
    .all(todayStart, todayEnd) as Array<{ id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number }>
}

export function updateQuestProgress(db: Database.Database, questId: string, progress: number): void {
  const quest = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as {
    target: number
    completed: number
    egg_reward_tier: string | null
  } | undefined
  if (!quest || quest.completed) return

  const completed = progress >= quest.target ? 1 : 0
  db.prepare('UPDATE daily_quests SET progress = ?, completed = ?, updated_at = ? WHERE id = ?').run(
    progress,
    completed,
    Date.now(),
    questId
  )

  // Award egg if this quest has an egg reward and just completed
  if (completed === 1 && quest.egg_reward_tier) {
    awardEgg(db, questId)
  }
}
