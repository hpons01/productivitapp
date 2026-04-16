import Database from 'better-sqlite3'
import { endOfDay, endOfWeek, startOfDay } from 'date-fns'
import { awardXP, getOrCreateDailyQuests } from './gamification.queries'
import { awardEgg } from './pets.queries'
import { awardFocus } from './shop.queries'

export type QuestStatus = 'available' | 'enrolled' | 'active' | 'completed' | 'failed' | 'expired' | 'abandoned'
export type QuestTimeWindowType = 'daily' | 'weekly' | 'custom'
export type QuestCategory = 'focus' | 'discipline' | 'reflection' | 'vitality' | 'mastery' | 'legendary'
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary'
export type CatalogEnrollmentStatus = 'enrolled' | 'active' | 'completed' | 'abandoned' | 'failed'

export interface QuestProgressResult {
  questId: string
  status: QuestStatus | CatalogEnrollmentStatus
  progress: number
  target: number
  milestoneXpAwarded: number
  completionXpAwarded: number
  focusAwarded: number
  penaltyApplied: number
}

export interface QuestDefinition {
  id: string
  slug: string
  title: string
  description: string
  flavor_text: string | null
  category: QuestCategory
  difficulty: QuestDifficulty
  target_type: string
  target_count: number
  xp_reward: number
  duration_days: number
  min_level_required: number
  max_level_visible: number | null
  egg_reward_tier: string | null
  loot_reward_tier: string | null
  is_active: number
  sort_order: number
}

export interface CatalogEnrollmentRow {
  id: string
  definition_id: string
  status: CatalogEnrollmentStatus
  progress: number
  milestones_awarded: number
  reward_xp_awarded: number
  sanction_xp: number
  enrolled_at: number
  deadline_at: number
  completed_at: number | null
  failed_at: number | null
  abandoned_at: number | null
  last_progress_at: number | null
  updated_at: number
}

export interface CatalogQuestView extends QuestDefinition {
  enrollment: CatalogEnrollmentRow | null
  scaled_xp_reward: number
  is_locked: boolean
  user_level: number
}

const ENROLLMENT_CAP = 3
const ACTIVE_STATUSES: QuestStatus[] = ['enrolled', 'active']

function getUserLevel(db: Database.Database): number {
  const result = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM xp_log')
    .get() as { total: number }
  return Math.max(1, Math.floor(Math.sqrt(result.total / 10)))
}

export function scaleCatalogXP(baseXP: number, userLevel: number, difficulty: QuestDifficulty): number {
  if (difficulty !== 'easy') return baseXP
  if (userLevel <= 10) return baseXP
  const scale = Math.max(0.25, 1 - (userLevel - 10) * 0.075)
  return Math.max(1, Math.round(baseXP * scale))
}

interface QuestRow {
  id: string
  date: number
  quest_type: string
  description: string
  target: number
  progress: number
  completed: number
  xp_reward: number
  focus_reward: number
  egg_reward_tier: string | null
  status: QuestStatus
  time_window_type: QuestTimeWindowType
  enrolled_at: number | null
  started_at: number | null
  deadline_at: number | null
  completed_at: number | null
  failed_at: number | null
  abandoned_at: number | null
  milestones_awarded: number
  reward_xp_awarded: number
  sanction_xp: number
  updated_at: number | null
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function hasXpLog(db: Database.Database, source: string, sourceId: string): boolean {
  const row = db
    .prepare('SELECT COUNT(*) as n FROM xp_log WHERE source = ? AND source_id = ?')
    .get(source, sourceId) as { n: number }
  return row.n > 0
}

function recordOutcome(
  db: Database.Database,
  questId: string,
  outcomeType: string,
  milestoneIndex = -1,
  xpDelta = 0,
  metadata: Record<string, unknown> | null = null
): void {
  db.prepare(`
    INSERT OR IGNORE INTO quest_outcomes (id, quest_id, outcome_type, milestone_index, xp_delta, recorded_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    makeId('quest_outcome'),
    questId,
    outcomeType,
    milestoneIndex,
    xpDelta,
    Date.now(),
    metadata ? JSON.stringify(metadata) : null
  )
}

function computeDeadline(now: Date, windowType: QuestTimeWindowType, customDurationMins?: number): number {
  if (windowType === 'weekly') {
    return endOfWeek(now, { weekStartsOn: 1 }).getTime()
  }

  if (windowType === 'custom') {
    const mins = Math.max(15, Math.min(7 * 24 * 60, Math.floor(customDurationMins ?? 120)))
    return now.getTime() + mins * 60 * 1000
  }

  return endOfDay(now).getTime()
}

function computePenalty(xpReward: number): number {
  const raw = Math.round(xpReward * 0.75)
  return Math.max(20, Math.min(250, raw))
}

function applyQuestSanction(db: Database.Database, quest: QuestRow): number {
  if (hasXpLog(db, 'quest_sanction', quest.id)) {
    return 0
  }

  const penalty = computePenalty(quest.xp_reward)
  db.prepare(`
    INSERT INTO xp_log (id, source, source_id, amount, base_amount, multiplier, class_id_applied, evolution_tier, logged_at)
    VALUES (?, 'quest_sanction', ?, ?, ?, 1, NULL, NULL, ?)
  `).run(makeId('xp'), quest.id, -penalty, -penalty, Date.now())

  return penalty
}

function getMilestoneThresholds(target: number): number[] {
  if (target <= 1) return []
  if (target === 2) return [1]

  const mid = Math.max(1, Math.ceil(target * 0.5))
  const late = Math.max(mid + 1, Math.ceil(target * 0.8))
  if (late >= target) return [mid]
  return [mid, late]
}

function transitionToFailed(db: Database.Database, quest: QuestRow, nowMs: number): number {
  if (quest.status === 'failed' || quest.status === 'expired' || quest.status === 'abandoned') {
    return 0
  }

  const penalty = applyQuestSanction(db, quest)

  db.prepare(`
    UPDATE daily_quests
    SET status = 'failed', failed_at = ?, sanction_xp = ?, updated_at = ?
    WHERE id = ?
  `).run(nowMs, penalty, nowMs, quest.id)

  db.prepare(`
    UPDATE quest_enrollments
    SET status = 'failed', failed_at = ?, updated_at = ?
    WHERE quest_id = ?
  `).run(nowMs, nowMs, quest.id)

  recordOutcome(db, quest.id, 'failed', -1, -penalty)
  return penalty
}

export function syncExpiredEnrolledQuests(db: Database.Database, nowMs = Date.now()): number {
  const stale = db.prepare(`
    SELECT *
    FROM daily_quests
    WHERE status IN ('enrolled', 'active')
      AND deadline_at IS NOT NULL
      AND deadline_at < ?
  `).all(nowMs) as QuestRow[]

  if (!stale.length) return 0

  const tx = db.transaction(() => {
    for (const quest of stale) {
      transitionToFailed(db, quest, nowMs)
    }
  })

  tx()
  return stale.length
}

export function listQuestBoard(db: Database.Database): QuestRow[] {
  getOrCreateDailyQuests(db)
  syncExpiredEnrolledQuests(db)

  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  return db.prepare(`
    SELECT *
    FROM daily_quests
    WHERE date >= ? AND date <= ?
    ORDER BY
      CASE status
        WHEN 'active' THEN 0
        WHEN 'enrolled' THEN 1
        WHEN 'available' THEN 2
        WHEN 'completed' THEN 3
        ELSE 4
      END,
      quest_type ASC
  `).all(todayStart, todayEnd) as QuestRow[]
}

export function enrollQuest(
  db: Database.Database,
  questId: string
): QuestRow {
  const now = new Date()
  const nowMs = now.getTime()
  const deadlineAt = endOfDay(now).getTime()

  const tx = db.transaction(() => {
    syncExpiredEnrolledQuests(db, nowMs)

    const activeCount = db.prepare(`
      SELECT COUNT(*) as n
      FROM daily_quests
      WHERE status IN ('enrolled', 'active')
    `).get() as { n: number }

    if (activeCount.n >= ENROLLMENT_CAP) {
      throw new Error(`Enrollment cap reached (${ENROLLMENT_CAP} active quests).`)
    }

    const quest = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as QuestRow | undefined
    if (!quest) {
      throw new Error('Quest not found.')
    }

    if (quest.completed || quest.status === 'completed') {
      throw new Error('Quest already completed.')
    }

    if (quest.status !== 'available') {
      throw new Error(`Quest cannot be enrolled from status: ${quest.status}`)
    }

    db.prepare(`
      UPDATE daily_quests
      SET
        status = 'enrolled',
        time_window_type = 'daily',
        enrolled_at = ?,
        started_at = ?,
        deadline_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(nowMs, nowMs, deadlineAt, nowMs, questId)

    db.prepare(`
      INSERT INTO quest_enrollments
        (id, quest_id, status, time_window_type, enrolled_at, started_at, deadline_at, created_at, updated_at)
      VALUES
        (?, ?, 'enrolled', 'daily', ?, ?, ?, ?, ?)
      ON CONFLICT(quest_id) DO UPDATE SET
        status = excluded.status,
        time_window_type = excluded.time_window_type,
        enrolled_at = excluded.enrolled_at,
        started_at = excluded.started_at,
        deadline_at = excluded.deadline_at,
        updated_at = excluded.updated_at
    `).run(makeId('enroll'), questId, nowMs, nowMs, deadlineAt, nowMs, nowMs)

    recordOutcome(db, questId, 'enrolled', -1, 0, { timeWindowType: 'daily', deadlineAt })
  })

  tx()

  const updated = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as QuestRow | undefined
  if (!updated) throw new Error('Quest enrollment failed.')
  return updated
}

export function abandonQuest(db: Database.Database, questId: string): QuestProgressResult {
  syncExpiredEnrolledQuests(db)

  const nowMs = Date.now()
  const tx = db.transaction(() => {
    const quest = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as QuestRow | undefined
    if (!quest) throw new Error('Quest not found.')

    if (!ACTIVE_STATUSES.includes(quest.status)) {
      throw new Error(`Quest cannot be abandoned from status: ${quest.status}`)
    }

    const penalty = applyQuestSanction(db, quest)

    db.prepare(`
      UPDATE daily_quests
      SET status = 'abandoned', abandoned_at = ?, sanction_xp = ?, updated_at = ?
      WHERE id = ?
    `).run(nowMs, penalty, nowMs, questId)

    db.prepare(`
      UPDATE quest_enrollments
      SET status = 'abandoned', abandoned_at = ?, updated_at = ?
      WHERE quest_id = ?
    `).run(nowMs, nowMs, questId)

    recordOutcome(db, questId, 'abandoned', -1, -penalty)
  })

  tx()

  const row = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as QuestRow
  return {
    questId,
    status: row.status,
    progress: row.progress,
    target: row.target,
    milestoneXpAwarded: 0,
    completionXpAwarded: 0,
    focusAwarded: 0,
    penaltyApplied: row.sanction_xp
  }
}

export function recordQuestProgress(db: Database.Database, questId: string, progress: number): QuestProgressResult {
  syncExpiredEnrolledQuests(db)

  const nowMs = Date.now()
  let result: QuestProgressResult | null = null

  const tx = db.transaction(() => {
    const quest = db.prepare('SELECT * FROM daily_quests WHERE id = ?').get(questId) as QuestRow | undefined
    if (!quest) {
      throw new Error('Quest not found.')
    }

    if (!ACTIVE_STATUSES.includes(quest.status)) {
      throw new Error(`Quest is not active. Current status: ${quest.status}`)
    }

    if (quest.deadline_at && nowMs > quest.deadline_at) {
      const penalty = transitionToFailed(db, quest, nowMs)
      result = {
        questId,
        status: 'failed',
        progress: quest.progress,
        target: quest.target,
        milestoneXpAwarded: 0,
        completionXpAwarded: 0,
        focusAwarded: 0,
        penaltyApplied: penalty
      }
      return
    }

    const clamped = Math.max(0, Math.min(quest.target, progress))
    const wasProgress = quest.progress
    const completedNow = clamped >= quest.target

    const thresholds = getMilestoneThresholds(quest.target)
    let milestoneXpAwarded = 0
    let milestonesAwarded = quest.milestones_awarded || 0

    for (let i = 0; i < thresholds.length; i++) {
      if (i < milestonesAwarded) continue
      if (clamped >= thresholds[i]) {
        const sourceId = `${quest.id}:milestone:${i + 1}`
        if (!hasXpLog(db, 'quest_milestone', sourceId)) {
          const milestoneReward = Math.max(5, Math.round(quest.xp_reward * 0.2))
          const award = awardXP(db, 'quest_milestone', sourceId, milestoneReward)
          milestoneXpAwarded += award.finalAmount
          recordOutcome(db, quest.id, 'milestone', i + 1, award.finalAmount, {
            threshold: thresholds[i]
          })
        }
        milestonesAwarded = i + 1
      }
    }

    let completionXpAwarded = 0
    if (completedNow) {
      const alreadyRewarded = hasXpLog(db, 'quest_completion', quest.id)
      if (!alreadyRewarded) {
        const completionReward = awardXP(db, 'quest_completion', quest.id, quest.xp_reward)
        completionXpAwarded = completionReward.finalAmount
      }

      if (quest.egg_reward_tier) {
        const existingEgg = db
          .prepare('SELECT COUNT(*) as n FROM pet_eggs WHERE source_quest_id = ?')
          .get(quest.id) as { n: number }
        if (existingEgg.n === 0) {
          awardEgg(db, quest.id)
        }
      }

      // Award Focus if this quest has a focus_reward
      let focusAwarded = 0
      if (quest.focus_reward > 0) {
        const focusSourceId = `quest_focus_${quest.id}`
        const alreadyAwarded = db
          .prepare('SELECT COUNT(*) as n FROM focus_log WHERE source_id = ?')
          .get(focusSourceId) as { n: number }
        if (alreadyAwarded.n === 0) {
          awardFocus(db, 'quest_completion', focusSourceId, quest.focus_reward)
          focusAwarded = quest.focus_reward
        }
      }

      db.prepare(`
        UPDATE daily_quests
        SET
          progress = ?,
          completed = 1,
          status = 'completed',
          completed_at = ?,
          milestones_awarded = ?,
          reward_xp_awarded = reward_xp_awarded + ?,
          updated_at = ?
        WHERE id = ?
      `).run(clamped, nowMs, milestonesAwarded, completionXpAwarded, nowMs, quest.id)

      db.prepare(`
        UPDATE quest_enrollments
        SET status = 'completed', completed_at = ?, last_progress_at = ?, updated_at = ?
        WHERE quest_id = ?
      `).run(nowMs, nowMs, nowMs, quest.id)

      recordOutcome(db, quest.id, 'completed', -1, completionXpAwarded)

      result = {
        questId,
        status: 'completed',
        progress: clamped,
        target: quest.target,
        milestoneXpAwarded,
        completionXpAwarded,
        focusAwarded,
        penaltyApplied: 0
      }
      return
    }

    const nextStatus: QuestStatus = quest.status === 'enrolled' ? 'active' : quest.status

    db.prepare(`
      UPDATE daily_quests
      SET
        progress = ?,
        status = ?,
        milestones_awarded = ?,
        updated_at = ?
      WHERE id = ?
    `).run(clamped, nextStatus, milestonesAwarded, nowMs, quest.id)

    db.prepare(`
      UPDATE quest_enrollments
      SET status = ?, last_progress_at = ?, updated_at = ?
      WHERE quest_id = ?
    `).run(nextStatus, nowMs, nowMs, quest.id)

    const progressDelta = Math.max(0, clamped - wasProgress)
    result = {
      questId,
      status: nextStatus,
      progress: clamped,
      target: quest.target,
      milestoneXpAwarded,
      completionXpAwarded: 0,
      focusAwarded: 0,
      penaltyApplied: 0
    }

    if (progressDelta > 0 && !milestoneXpAwarded) {
      recordOutcome(db, quest.id, 'progress', -1, 0, { progress: clamped, target: quest.target })
    }
  })

  tx()

  if (!result) {
    throw new Error('Unable to update quest progress.')
  }

  return result
}

export function incrementQuestProgressByType(db: Database.Database, questType: string, delta: number): QuestProgressResult[] {
  syncExpiredEnrolledQuests(db)

  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  const rows = db.prepare(`
    SELECT *
    FROM daily_quests
    WHERE quest_type = ?
      AND date >= ?
      AND date <= ?
      AND status IN ('enrolled', 'active')
    ORDER BY deadline_at ASC NULLS LAST
  `).all(questType, todayStart, todayEnd) as QuestRow[]

  const results: QuestProgressResult[] = []
  for (const row of rows) {
    results.push(recordQuestProgress(db, row.id, row.progress + delta))
  }

  // Also propagate to active catalog enrollments of matching type
  const catalogRows = db.prepare(`
    SELECT ce.id, ce.progress
    FROM catalog_enrollments ce
    JOIN quest_definitions qd ON qd.id = ce.definition_id
    WHERE qd.target_type = ?
      AND ce.status IN ('enrolled', 'active')
  `).all(questType) as Array<{ id: string; progress: number }>

  for (const row of catalogRows) {
    try {
      results.push(recordCatalogQuestProgress(db, row.id, row.progress + delta))
    } catch {
      // Silently skip if quest expired or completed concurrently
    }
  }

  return results
}

export function setQuestProgressByType(db: Database.Database, questType: string, progress: number): QuestProgressResult[] {
  syncExpiredEnrolledQuests(db)

  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  const rows = db.prepare(`
    SELECT *
    FROM daily_quests
    WHERE quest_type = ?
      AND date >= ?
      AND date <= ?
      AND status IN ('enrolled', 'active')
    ORDER BY deadline_at ASC NULLS LAST
  `).all(questType, todayStart, todayEnd) as QuestRow[]

  const results: QuestProgressResult[] = []
  for (const row of rows) {
    results.push(recordQuestProgress(db, row.id, progress))
  }
  return results
}

export function getQuestHistory(db: Database.Database, limit = 100): Array<{
  id: string
  quest_id: string
  outcome_type: string
  milestone_index: number
  xp_delta: number
  recorded_at: number
  metadata: string | null
  quest_type: string
  description: string
}> {
  return db.prepare(`
    SELECT
      o.id,
      o.quest_id,
      o.outcome_type,
      o.milestone_index,
      o.xp_delta,
      o.recorded_at,
      o.metadata,
      q.quest_type,
      q.description
    FROM quest_outcomes o
    INNER JOIN daily_quests q ON q.id = o.quest_id
    ORDER BY o.recorded_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: string
    quest_id: string
    outcome_type: string
    milestone_index: number
    xp_delta: number
    recorded_at: number
    metadata: string | null
    quest_type: string
    description: string
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG QUEST FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function applyCatalogSanction(db: Database.Database, enrollment: CatalogEnrollmentRow, scaledXP: number): number {
  const sourceId = `catalog_sanction_${enrollment.id}`
  const alreadySanctioned = db
    .prepare('SELECT COUNT(*) as n FROM xp_log WHERE source = ? AND source_id = ?')
    .get('catalog_sanction', sourceId) as { n: number }
  if (alreadySanctioned.n > 0) return 0

  const raw = Math.round(scaledXP * 0.75)
  const penalty = Math.max(20, Math.min(250, raw))
  db.prepare(`
    INSERT INTO xp_log (id, source, source_id, amount, base_amount, multiplier, class_id_applied, evolution_tier, logged_at)
    VALUES (?, 'catalog_sanction', ?, ?, ?, 1, NULL, NULL, ?)
  `).run(`xp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, sourceId, -penalty, -penalty, Date.now())
  return penalty
}

export function syncExpiredCatalogEnrollments(db: Database.Database, nowMs = Date.now()): number {
  const stale = db.prepare(`
    SELECT ce.*, qd.xp_reward, qd.difficulty
    FROM catalog_enrollments ce
    JOIN quest_definitions qd ON qd.id = ce.definition_id
    WHERE ce.status IN ('enrolled', 'active')
      AND ce.deadline_at < ?
  `).all(nowMs) as Array<CatalogEnrollmentRow & { xp_reward: number; difficulty: QuestDifficulty }>

  if (!stale.length) return 0

  const userLevel = getUserLevel(db)

  const tx = db.transaction(() => {
    for (const enrollment of stale) {
      const scaledXP = scaleCatalogXP(enrollment.xp_reward, userLevel, enrollment.difficulty)
      const penalty = applyCatalogSanction(db, enrollment, scaledXP)
      db.prepare(`
        UPDATE catalog_enrollments
        SET status = 'failed', failed_at = ?, sanction_xp = ?, updated_at = ?
        WHERE id = ?
      `).run(nowMs, penalty, nowMs, enrollment.id)
    }
  })

  tx()
  return stale.length
}

export function getCatalogQuests(db: Database.Database): CatalogQuestView[] {
  syncExpiredCatalogEnrollments(db)

  const userLevel = getUserLevel(db)

  const definitions = db.prepare(`
    SELECT * FROM quest_definitions
    WHERE is_active = 1
      AND (max_level_visible IS NULL OR max_level_visible >= ?)
    ORDER BY sort_order ASC, min_level_required ASC
  `).all(userLevel) as QuestDefinition[]

  // Fetch most-recent enrollment per definition (any status)
  const enrollments = db.prepare(`
    SELECT ce.*
    FROM catalog_enrollments ce
    INNER JOIN (
      SELECT definition_id, MAX(enrolled_at) as latest
      FROM catalog_enrollments
      GROUP BY definition_id
    ) latest ON ce.definition_id = latest.definition_id AND ce.enrolled_at = latest.latest
  `).all() as CatalogEnrollmentRow[]

  const enrollmentMap = new Map<string, CatalogEnrollmentRow>()
  for (const e of enrollments) {
    enrollmentMap.set(e.definition_id, e)
  }

  return definitions.map((def) => ({
    ...def,
    enrollment: enrollmentMap.get(def.id) ?? null,
    scaled_xp_reward: scaleCatalogXP(def.xp_reward, userLevel, def.difficulty),
    is_locked: userLevel < def.min_level_required,
    user_level: userLevel
  }))
}

export function enrollCatalogQuest(db: Database.Database, definitionId: string): CatalogEnrollmentRow {
  syncExpiredCatalogEnrollments(db)

  const nowMs = Date.now()
  const userLevel = getUserLevel(db)

  let newId: string | null = null

  const tx = db.transaction(() => {
    const def = db
      .prepare('SELECT * FROM quest_definitions WHERE id = ? AND is_active = 1')
      .get(definitionId) as QuestDefinition | undefined
    if (!def) throw new Error('Quest definition not found.')

    if (userLevel < def.min_level_required) {
      throw new Error(`Requires level ${def.min_level_required} (you are level ${userLevel}).`)
    }

    const existing = db.prepare(`
      SELECT id FROM catalog_enrollments
      WHERE definition_id = ? AND status IN ('enrolled', 'active')
    `).get(definitionId) as { id: string } | undefined
    if (existing) throw new Error('Already enrolled in this quest.')

    const deadlineAt = nowMs + def.duration_days * 24 * 60 * 60 * 1000
    const id = makeId('cenroll')

    db.prepare(`
      INSERT INTO catalog_enrollments
        (id, definition_id, status, progress, milestones_awarded, reward_xp_awarded,
         sanction_xp, enrolled_at, deadline_at, updated_at)
      VALUES (?, ?, 'enrolled', 0, 0, 0, 0, ?, ?, ?)
    `).run(id, definitionId, nowMs, deadlineAt, nowMs)

    newId = id
  })

  tx()

  if (!newId) throw new Error('Catalog enrollment failed.')
  return db.prepare('SELECT * FROM catalog_enrollments WHERE id = ?').get(newId) as CatalogEnrollmentRow
}

export function abandonCatalogQuest(db: Database.Database, enrollmentId: string): CatalogEnrollmentRow {
  const nowMs = Date.now()

  const row = db.prepare('SELECT * FROM catalog_enrollments WHERE id = ?').get(enrollmentId) as CatalogEnrollmentRow | undefined
  if (!row) throw new Error('Enrollment not found.')
  if (row.status !== 'enrolled' && row.status !== 'active') {
    throw new Error(`Cannot abandon quest with status: ${row.status}`)
  }

  db.prepare(`
    UPDATE catalog_enrollments
    SET status = 'abandoned', abandoned_at = ?, updated_at = ?
    WHERE id = ?
  `).run(nowMs, nowMs, enrollmentId)

  return db.prepare('SELECT * FROM catalog_enrollments WHERE id = ?').get(enrollmentId) as CatalogEnrollmentRow
}

export function recordCatalogQuestProgress(
  db: Database.Database,
  enrollmentId: string,
  newProgress: number
): QuestProgressResult {
  syncExpiredCatalogEnrollments(db)

  const nowMs = Date.now()
  let result: QuestProgressResult | null = null

  const tx = db.transaction(() => {
    const enrollment = db.prepare(`
      SELECT ce.*, qd.target_count, qd.xp_reward, qd.egg_reward_tier, qd.difficulty, qd.focus_reward
      FROM catalog_enrollments ce
      JOIN quest_definitions qd ON qd.id = ce.definition_id
      WHERE ce.id = ?
    `).get(enrollmentId) as (CatalogEnrollmentRow & {
      target_count: number
      xp_reward: number
      egg_reward_tier: string | null
      difficulty: QuestDifficulty
      focus_reward: number
    }) | undefined

    if (!enrollment) throw new Error('Catalog enrollment not found.')

    if (enrollment.status === 'completed' || enrollment.status === 'abandoned' || enrollment.status === 'failed') {
      result = {
        questId: enrollmentId,
        status: enrollment.status,
        progress: enrollment.progress,
        target: enrollment.target_count,
        milestoneXpAwarded: 0,
        completionXpAwarded: 0,
        focusAwarded: 0,
        penaltyApplied: 0
      }
      return
    }

    // Check if deadline passed
    if (nowMs > enrollment.deadline_at) {
      const userLevel = getUserLevel(db)
      const scaledXP = scaleCatalogXP(enrollment.xp_reward, userLevel, enrollment.difficulty)
      const penalty = applyCatalogSanction(db, enrollment, scaledXP)
      db.prepare(`
        UPDATE catalog_enrollments
        SET status = 'failed', failed_at = ?, sanction_xp = ?, updated_at = ?
        WHERE id = ?
      `).run(nowMs, penalty, nowMs, enrollmentId)
      result = {
        questId: enrollmentId,
        status: 'failed',
        progress: enrollment.progress,
        target: enrollment.target_count,
        milestoneXpAwarded: 0,
        completionXpAwarded: 0,
        focusAwarded: 0,
        penaltyApplied: penalty
      }
      return
    }

    const userLevel = getUserLevel(db)
    const scaledXP = scaleCatalogXP(enrollment.xp_reward, userLevel, enrollment.difficulty)
    const clamped = Math.max(0, Math.min(enrollment.target_count, newProgress))
    const completedNow = clamped >= enrollment.target_count

    // Milestone handling
    const thresholds = getMilestoneThresholds(enrollment.target_count)
    let milestoneXpAwarded = 0
    let milestonesAwarded = enrollment.milestones_awarded

    for (let i = 0; i < thresholds.length; i++) {
      if (i < milestonesAwarded) continue
      if (clamped >= thresholds[i]) {
        const sourceId = `${enrollment.id}:milestone:${i + 1}`
        if (!hasXpLog(db, 'catalog_quest_milestone', sourceId)) {
          const milestoneReward = Math.max(5, Math.round(scaledXP * 0.2))
          const award = awardXP(db, 'catalog_quest_milestone', sourceId, milestoneReward)
          milestoneXpAwarded += award.finalAmount
        }
        milestonesAwarded = i + 1
      }
    }

    let completionXpAwarded = 0
    if (completedNow) {
      if (!hasXpLog(db, 'catalog_quest_completion', enrollment.id)) {
        const completionReward = awardXP(db, 'catalog_quest_completion', enrollment.id, scaledXP)
        completionXpAwarded = completionReward.finalAmount
      }

      if (enrollment.egg_reward_tier) {
        const existingEgg = db
          .prepare('SELECT COUNT(*) as n FROM pet_eggs WHERE source_quest_id = ?')
          .get(enrollment.id) as { n: number }
        if (existingEgg.n === 0) {
          awardEgg(db, enrollment.id)
        }
      }

      // Award Focus if this quest definition has a focus_reward
      let focusAwarded = 0
      if (enrollment.focus_reward > 0) {
        const focusSourceId = `catalog_focus_${enrollment.id}`
        const alreadyAwarded = db
          .prepare('SELECT COUNT(*) as n FROM focus_log WHERE source_id = ?')
          .get(focusSourceId) as { n: number }
        if (alreadyAwarded.n === 0) {
          awardFocus(db, 'quest_completion', focusSourceId, enrollment.focus_reward)
          focusAwarded = enrollment.focus_reward
        }
      }

      db.prepare(`
        UPDATE catalog_enrollments
        SET status = 'completed', progress = ?, milestones_awarded = ?,
            reward_xp_awarded = reward_xp_awarded + ?,
            completed_at = ?, last_progress_at = ?, updated_at = ?
        WHERE id = ?
      `).run(clamped, milestonesAwarded, completionXpAwarded, nowMs, nowMs, nowMs, enrollmentId)

      result = {
        questId: enrollmentId,
        status: 'completed',
        progress: clamped,
        target: enrollment.target_count,
        milestoneXpAwarded,
        completionXpAwarded,
        focusAwarded,
        penaltyApplied: 0
      }
      return
    }

    const nextStatus: CatalogEnrollmentStatus = enrollment.status === 'enrolled' ? 'active' : enrollment.status

    db.prepare(`
      UPDATE catalog_enrollments
      SET status = ?, progress = ?, milestones_awarded = ?,
          last_progress_at = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, clamped, milestonesAwarded, nowMs, nowMs, enrollmentId)

    result = {
      questId: enrollmentId,
      status: nextStatus,
      progress: clamped,
      target: enrollment.target_count,
      milestoneXpAwarded,
      completionXpAwarded: 0,
      focusAwarded: 0,
      penaltyApplied: 0
    }
  })

  tx()

  if (!result) throw new Error('Unable to update catalog quest progress.')
  return result
}

export function incrementCatalogProgressByType(db: Database.Database, questType: string, delta: number): void {
  const catalogRows = db.prepare(`
    SELECT ce.id, ce.progress
    FROM catalog_enrollments ce
    JOIN quest_definitions qd ON qd.id = ce.definition_id
    WHERE qd.target_type = ?
      AND ce.status IN ('enrolled', 'active')
  `).all(questType) as Array<{ id: string; progress: number }>

  for (const row of catalogRows) {
    try {
      recordCatalogQuestProgress(db, row.id, row.progress + delta)
    } catch {
      // Skip if expired or completed concurrently
    }
  }
}

export function decrementCatalogProgressByType(db: Database.Database, questType: string, delta: number): void {
  if (!Number.isFinite(delta) || delta <= 0) return
  incrementCatalogProgressByType(db, questType, -Math.floor(delta))
}

export function setCatalogProgressByType(db: Database.Database, questType: string, progress: number): void {
  const nextProgress = Math.max(0, Math.floor(progress))

  const catalogRows = db.prepare(`
    SELECT ce.id
    FROM catalog_enrollments ce
    JOIN quest_definitions qd ON qd.id = ce.definition_id
    WHERE qd.target_type = ?
      AND ce.status IN ('enrolled', 'active')
  `).all(questType) as Array<{ id: string }>

  for (const row of catalogRows) {
    try {
      recordCatalogQuestProgress(db, row.id, nextProgress)
    } catch {
      // Skip if expired or completed concurrently
    }
  }
}
