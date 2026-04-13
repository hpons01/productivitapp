import { create } from 'zustand'
import { levelFromXP, levelProgress, xpToNextLevel } from '../lib/science/xp'
import { shouldReward, rollLoot, LootItem, isStreakMilestone } from '../lib/science/rewards'
import { checkAchievements, AchievementStats } from '../lib/science/achievements'

const api = () => window.api

export interface PendingReward {
  id: string
  type: 'xp_popup' | 'badge_unlock' | 'loot_box' | 'level_up' | 'boss_defeated' | 'defeat_screen'
  data: Record<string, unknown>
}

interface GamificationState {
  totalXP: number
  level: number
  characterClass: string
  focusPower: number
  discipline: number
  vitality: number
  wisdom: number
  unlockedBadges: Set<string>
  pendingRewards: PendingReward[]

  // Actions
  initialize: () => Promise<void>
  addXP: (source: string, amount: number, showPopup?: boolean) => Promise<void>
  checkAndUnlockBadges: (stats: AchievementStats) => Promise<void>
  triggerLootBox: (context?: string) => void
  dismissReward: (id: string) => void
  refreshFromDB: () => Promise<void>
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  totalXP: 0,
  level: 1,
  characterClass: 'Apprentice',
  focusPower: 0,
  discipline: 0,
  vitality: 0,
  wisdom: 0,
  unlockedBadges: new Set(),
  pendingRewards: [],

  initialize: async () => {
    await get().refreshFromDB()
  },

  refreshFromDB: async () => {
    try {
      const stats = await api().analytics.dashboard()
      const newLevel = levelFromXP(stats.totalXP)
      const oldLevel = get().level

      set({
        totalXP: stats.totalXP,
        level: newLevel,
        characterClass: stats.characterClass,
        focusPower: stats.focusPower,
        discipline: stats.discipline,
        vitality: stats.vitality,
        wisdom: stats.wisdom,
        unlockedBadges: new Set(
          stats.badges.filter((b: { unlocked_at: number | null }) => b.unlocked_at).map((b: { code: string }) => b.code)
        )
      })

      // Level up notification
      if (newLevel > oldLevel && oldLevel > 0) {
        const id = `levelup_${Date.now()}`
        set((s) => ({
          pendingRewards: [
            ...s.pendingRewards,
            { id, type: 'level_up', data: { newLevel, oldLevel, characterClass: stats.characterClass } }
          ]
        }))
      }
    } catch (e) {
      console.error('Failed to refresh gamification stats', e)
    }
  },

  addXP: async (source: string, amount: number, showPopup = true) => {
    const oldLevel = get().level

    await api().analytics.addXp(source, `${source}_${Date.now()}`, amount)
    await get().refreshFromDB()

    if (showPopup) {
      const id = `xp_${Date.now()}`
      set((s) => ({
        pendingRewards: [
          ...s.pendingRewards,
          { id, type: 'xp_popup', data: { amount, source } }
        ]
      }))

      // Auto-dismiss XP popup
      setTimeout(() => get().dismissReward(id), 2000)
    }
  },

  checkAndUnlockBadges: async (stats: AchievementStats) => {
    const { unlockedBadges } = get()
    const toUnlock = checkAchievements(stats, unlockedBadges)

    for (const code of toUnlock) {
      const result = await api().analytics.unlockBadge(code)
      if (result.unlocked && result.badge) {
        const id = `badge_${code}_${Date.now()}`
        set((s) => ({
          unlockedBadges: new Set([...s.unlockedBadges, code]),
          pendingRewards: [
            ...s.pendingRewards,
            { id, type: 'badge_unlock', data: { badge: result.badge } }
          ]
        }))

        // Award badge XP
        await api().analytics.addXp('badge', code, result.badge.xp_value)
        await get().refreshFromDB()
      }
    }
  },

  triggerLootBox: (context = 'default') => {
    if (!shouldReward(context)) return

    const loot = rollLoot()
    const id = `loot_${Date.now()}`

    set((s) => ({
      pendingRewards: [
        ...s.pendingRewards,
        { id, type: 'loot_box', data: { loot, context } }
      ]
    }))

    // If loot is XP boost, award it
    if (loot.type === 'xp_boost' && loot.value) {
      get().addXP('loot', loot.value, false)
    }
  },

  dismissReward: (id: string) => {
    set((s) => ({
      pendingRewards: s.pendingRewards.filter((r) => r.id !== id)
    }))
  }
}))
