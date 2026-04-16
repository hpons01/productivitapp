import { Badge } from '../../components/ui/badge'

type RewardBadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'

export interface QuestRewardBadgeItem {
  key: string
  label: string
  variant?: RewardBadgeVariant
}

interface BuildQuestRewardBadgesOptions {
  eggRewardTier?: string | null
  lootRewardTier?: string | null
  focusReward?: number
  extraRewards?: QuestRewardBadgeItem[]
}

function formatTierLabel(tier: string | null | undefined): string {
  if (!tier) return ''
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

export function buildQuestRewardBadges({
  eggRewardTier,
  lootRewardTier,
  focusReward,
  extraRewards = []
}: BuildQuestRewardBadgesOptions): QuestRewardBadgeItem[] {
  const rewards: QuestRewardBadgeItem[] = []

  if (eggRewardTier) {
    rewards.push({
      key: 'egg-reward',
      label: `Egg reward (${formatTierLabel(eggRewardTier)})`,
      variant: 'success'
    })
  }

  if (lootRewardTier) {
    rewards.push({
      key: 'loot-reward',
      label: `Loot reward (${formatTierLabel(lootRewardTier)})`,
      variant: lootRewardTier as RewardBadgeVariant
    })
  }

  if (focusReward && focusReward > 0) {
    rewards.push({
      key: 'focus-reward',
      label: `+${focusReward} Focus 💎`,
      variant: 'primary'
    })
  }

  return [...rewards, ...extraRewards]
}

interface QuestRewardBadgesProps {
  rewards: QuestRewardBadgeItem[]
}

export function QuestRewardBadges({ rewards }: QuestRewardBadgesProps) {
  if (rewards.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wide text-surface-400 font-semibold">Rewards</span>
      {rewards.map((reward) => (
        <Badge
          key={reward.key}
          variant={reward.variant ?? 'default'}
          className="text-[10px] px-1.5 py-0.5"
        >
          {reward.label}
        </Badge>
      ))}
    </div>
  )
}