export type QuestStatus = 'available' | 'enrolled' | 'active' | 'completed' | 'failed' | 'expired' | 'abandoned'
export type QuestCategory = 'focus' | 'discipline' | 'reflection' | 'vitality' | 'mastery' | 'legendary'
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary'
export type CatalogEnrollmentStatus = 'enrolled' | 'active' | 'completed' | 'abandoned' | 'failed'
export type ActiveQuestStatus = 'enrolled' | 'active'

export interface DailyQuestItem {
  id: string
  quest_type: string
  description: string
  target: number
  progress: number
  status: QuestStatus
  xp_reward: number
  egg_reward_tier: string | null
  focus_reward: number
  deadline_at: number | null
  sanction_xp: number
}

export interface CatalogEnrollment {
  id: string
  status: CatalogEnrollmentStatus
  progress: number
  enrolled_at: number
  deadline_at: number
  completed_at: number | null
  failed_at: number | null
  abandoned_at: number | null
  sanction_xp: number
}

export interface CatalogQuestItem {
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
  scaled_xp_reward: number
  focus_reward: number
  duration_days: number
  min_level_required: number
  egg_reward_tier: string | null
  loot_reward_tier: string | null
  is_locked: boolean
  user_level: number
  enrollment: CatalogEnrollment | null
}

interface ActiveQuestBase {
  source: 'daily' | 'catalog'
  id: string
  title: string
  description: string
  status: ActiveQuestStatus
  progress: number
  target: number
  deadline_at: number | null
  xp_reward: number
}

export interface ActiveDailyQuestItem extends ActiveQuestBase {
  source: 'daily'
  questId: string
}

export interface ActiveCatalogQuestItem extends ActiveQuestBase {
  source: 'catalog'
  enrollmentId: string
  definitionId: string
  difficulty: QuestDifficulty
}

export type ActiveQuestItem = ActiveDailyQuestItem | ActiveCatalogQuestItem

export function formatRemaining(deadlineAt: number | null): string {
  if (!deadlineAt) return 'No deadline'
  const diff = deadlineAt - Date.now()
  if (diff <= 0) return 'Expired'

  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m left`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return `${hours}h ${remMins}m left`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return `${days}d ${remHours}h left`
}
