import { create } from 'zustand'
import { levelFromXP, levelProgress, xpToNextLevel } from '../lib/science/xp'
import { shouldReward, rollLoot, LootItem, isStreakMilestone } from '../lib/science/rewards'
import { checkAchievements, AchievementStats } from '../lib/science/achievements'
import { CharacterClassOption } from '../lib/constants/classes'

const api = () => window.api

export interface PendingReward {
  id: string
  type: 'xp_popup' | 'badge_unlock' | 'loot_box' | 'level_up' | 'boss_defeated' | 'defeat_screen' | 'class_changed' | 'evolution_unlocked' | 'egg_hatch'
  data: Record<string, unknown>
}

interface GamificationState {
  totalXP: number
  level: number
  hydrated: boolean
  characterClass: string
  selectedClassId: string
  selectedClassDescription: string
  classBonusSource: string | null
  classBonusMultiplier: number
  classMasteryXp: number
  classEvolutionTitle: string
  classEvolutionIndex: number
  classEvolutionNextTitle: string | null
  classEvolutionNextXp: number | null
  classEvolutionProgressPct: number
  playstyleClass: string
  classOptions: CharacterClassOption[]
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
  setCharacterClass: (classId: string) => Promise<void>
  loadCharacterClassConfig: () => Promise<void>
  triggerLootBox: (context?: string) => void
  dismissReward: (id: string) => void
  refreshFromDB: () => Promise<void>
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  totalXP: 0,
  level: 1,
  hydrated: false,
  characterClass: 'Apprentice',
  selectedClassId: 'apprentice',
  selectedClassDescription: 'Learning every discipline. No class bonus yet.',
  classBonusSource: null,
  classBonusMultiplier: 1,
  classMasteryXp: 0,
  classEvolutionTitle: 'Seeker',
  classEvolutionIndex: 0,
  classEvolutionNextTitle: 'Journeyman',
  classEvolutionNextXp: 300,
  classEvolutionProgressPct: 0,
  playstyleClass: 'Apprentice',
  classOptions: [],
  focusPower: 0,
  discipline: 0,
  vitality: 0,
  wisdom: 0,
  unlockedBadges: new Set(),
  pendingRewards: [],

  initialize: async () => {
    await Promise.all([get().refreshFromDB(), get().loadCharacterClassConfig()])
    set({ hydrated: true })
  },

  loadCharacterClassConfig: async () => {
    try {
      const config = await api().analytics.classConfig()
      set({
        selectedClassId: config.selectedClassId,
        classOptions: config.classes || []
      })
    } catch (e) {
      console.error('Failed to load class config', e)
    }
  },

  refreshFromDB: async () => {
    try {
      const stats = await api().analytics.dashboard()
      const newLevel = levelFromXP(stats.totalXP)
      const oldLevel = get().level
      const oldEvolutionIndex = get().classEvolutionIndex
      const { hydrated } = get()

      set({
        totalXP: stats.totalXP,
        level: newLevel,
        characterClass: stats.characterClass,
        selectedClassId: stats.selectedClassId,
        selectedClassDescription: stats.selectedClassDescription,
        classBonusSource: stats.classBonusSource,
        classBonusMultiplier: stats.classBonusMultiplier,
        classMasteryXp: stats.classMasteryXp,
        classEvolutionTitle: stats.classEvolutionTitle,
        classEvolutionIndex: stats.classEvolutionIndex,
        classEvolutionNextTitle: stats.classEvolutionNextTitle,
        classEvolutionNextXp: stats.classEvolutionNextXp,
        classEvolutionProgressPct: stats.classEvolutionProgressPct,
        playstyleClass: stats.playstyleClass,
        focusPower: stats.focusPower,
        discipline: stats.discipline,
        vitality: stats.vitality,
        wisdom: stats.wisdom,
        unlockedBadges: new Set(
          stats.badges.filter((b: { unlocked_at: number | null }) => b.unlocked_at).map((b: { code: string }) => b.code)
        )
      })

      // Level up notification
      if (hydrated && newLevel > oldLevel && oldLevel > 0) {
        const id = `levelup_${Date.now()}`
        set((s) => ({
          pendingRewards: [
            ...s.pendingRewards,
            { id, type: 'level_up', data: { newLevel, oldLevel, characterClass: stats.characterClass } }
          ]
        }))
      }

      if (hydrated && stats.classEvolutionIndex > oldEvolutionIndex) {
        const id = `evolution_${Date.now()}`
        set((s) => ({
          pendingRewards: [
            ...s.pendingRewards,
            {
              id,
              type: 'evolution_unlocked',
              data: {
                className: stats.characterClass,
                evolutionTitle: stats.classEvolutionTitle
              }
            }
          ]
        }))

        setTimeout(() => get().dismissReward(id), 3000)
      }
    } catch (e) {
      console.error('Failed to refresh gamification stats', e)
    }
  },

  addXP: async (source: string, amount: number, showPopup = true) => {
    const result = await api().analytics.addXp(source, `${source}_${Date.now()}`, amount)
    await get().refreshFromDB()

    if (showPopup) {
      const id = `xp_${Date.now()}`
      set((s) => ({
        pendingRewards: [
          ...s.pendingRewards,
          { id, type: 'xp_popup', data: { amount: result.finalAmount || amount, source } }
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

        // XP is already awarded in the unlock handler on the main process.
        await get().refreshFromDB()
      }
    }
  },

  setCharacterClass: async (classId: string) => {
    const previousId = get().selectedClassId
    if (previousId === classId) return

    await api().analytics.setCharacterClass(classId)
    await Promise.all([get().refreshFromDB(), get().loadCharacterClassConfig()])

    const selectedClass = get().classOptions.find((c) => c.id === classId)
    const toastId = `class_${Date.now()}`
    set((s) => ({
      pendingRewards: [
        ...s.pendingRewards,
        {
          id: toastId,
          type: 'class_changed',
          data: {
            classId,
            className: selectedClass?.name || 'Unknown Class',
            classIcon: selectedClass?.icon || '🛡️',
            evolutionTitle: s.classEvolutionTitle || 'Initiate'
          }
        }
      ]
    }))

    setTimeout(() => get().dismissReward(toastId), 2600)
  },

  triggerLootBox: (context = 'default') => {
    if (!shouldReward(context, get().classEvolutionIndex)) return

    const loot = rollLoot(undefined, get().classEvolutionIndex)
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
