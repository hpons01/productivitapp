import { create } from 'zustand'
import { levelFromXP, levelProgress, xpToNextLevel } from '../lib/science/xp'
import { shouldReward, rollLoot, rollLootDeduped, LootItem, isStreakMilestone } from '../lib/science/rewards'
import { checkAchievements, AchievementStats } from '../lib/science/achievements'
import { CharacterClassOption } from '../lib/constants/classes'

const api = () => window.api

const CORE_VALUE_CUES: Record<string, string> = {
  health: 'Show up with sustainable intensity and protect your energy.',
  growth: 'Stack one more win. Your identity compounds with each action.',
  discipline: 'Keep promises to yourself, especially when it is uncomfortable.',
  freedom: 'Each completed block buys back future time and choice.',
  family: 'Consistency here helps you show up stronger for your people.',
  mastery: 'Reps today become excellence later. Stay in deliberate practice.',
  impact: 'Today\'s execution can create value beyond yourself.',
  calm: 'Stay grounded. Smooth execution beats frantic effort.'
}

const LEVEL_UP_FOCUS_REWARD = 10

function focusForLevel(level: number): number {
  return level >= 2 ? LEVEL_UP_FOCUS_REWARD : 0
}

function totalLevelUpFocus(oldLevel: number, newLevel: number): number {
  if (newLevel <= oldLevel) return 0

  let total = 0
  for (let level = oldLevel + 1; level <= newLevel; level += 1) {
    total += focusForLevel(level)
  }
  return total
}

function resolveIdentityCue(coreValuesRaw: string | null, fallback: string): string {
  if (!coreValuesRaw) return fallback

  try {
    const parsed = JSON.parse(coreValuesRaw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const primary = parsed.find((value): value is string => typeof value === 'string')
      if (primary && CORE_VALUE_CUES[primary]) {
        return CORE_VALUE_CUES[primary]
      }
    }
  } catch {
    // Ignore parse errors and use fallback.
  }

  return fallback
}

export interface PendingReward {
  id: string
  type: 'xp_popup' | 'badge_unlock' | 'loot_box' | 'level_up' | 'boss_defeated' | 'defeat_screen' | 'class_changed' | 'evolution_unlocked' | 'egg_hatch' | 'focus_earned' | 'quest_completed' | 'task_done'
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
  triggerLootBox: (context?: string) => Promise<void>
  triggerQuestCompleted: (title: string, xpAwarded: number, focusAwarded?: number) => void
  triggerTaskDone: (taskTitle: string, xpAwarded: number) => void
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
      const [stats, coreValuesRaw] = await Promise.all([
        api().analytics.dashboard(),
        api().settings.get('core_values')
      ])
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
        const focusAwarded = totalLevelUpFocus(oldLevel, newLevel)
        const identityCue = resolveIdentityCue(
          typeof coreValuesRaw === 'string' ? coreValuesRaw : null,
          'You are becoming the kind of person who executes with consistency.'
        )

        const rewardsToAdd: PendingReward[] = [
          {
            id,
            type: 'level_up',
            data: { newLevel, oldLevel, characterClass: stats.characterClass, identityCue, focusAwarded }
          }
        ]

        if (focusAwarded > 0) {
          const focusId = `focus_level_${Date.now()}`
          rewardsToAdd.push({ id: focusId, type: 'focus_earned', data: { amount: focusAwarded } })
          setTimeout(() => get().dismissReward(focusId), 2200)
          void import('./shop.store').then(({ useShopStore }) => {
            void useShopStore.getState().refreshBalance()
          })
        }

        set((s) => ({
          pendingRewards: [...s.pendingRewards, ...rewardsToAdd]
        }))
      }

      if (hydrated && stats.classEvolutionIndex > oldEvolutionIndex) {
        const id = `evolution_${Date.now()}`
        const identityCue = resolveIdentityCue(
          typeof coreValuesRaw === 'string' ? coreValuesRaw : null,
          'You unlocked a stronger form. Prove it with one focused action today.'
        )
        set((s) => ({
          pendingRewards: [
            ...s.pendingRewards,
            {
              id,
              type: 'evolution_unlocked',
              data: {
                className: stats.characterClass,
                evolutionTitle: stats.classEvolutionTitle,
                identityCue
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
        const rewardsToAdd: PendingReward[] = [
          { id, type: 'badge_unlock', data: { badge: result.badge } }
        ]

        // If Focus was awarded alongside this badge, show a Focus popup
        if (result.badge.focus_awarded && result.badge.focus_awarded > 0) {
          const focusId = `focus_badge_${code}_${Date.now()}`
          rewardsToAdd.push({
            id: focusId,
            type: 'focus_earned',
            data: { amount: result.badge.focus_awarded }
          })
          // Refresh shop store balance
          const { useShopStore } = await import('./shop.store')
          void useShopStore.getState().refreshBalance()

          setTimeout(() => get().dismissReward(focusId), 2200)
        }

        set((s) => ({
          unlockedBadges: new Set([...s.unlockedBadges, code]),
          pendingRewards: [...s.pendingRewards, ...rewardsToAdd]
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

  triggerLootBox: async (context = 'default') => {
    if (!shouldReward(context, get().classEvolutionIndex)) return

    // Build set of already-owned cosmetic/theme names to prevent duplicates
    let ownedNames = new Set<string>()
    try {
      const existing = await api().loot.list() as Array<{ type: string; payload: string }>
      ownedNames = new Set(
        existing
          .filter((i) => i.type === 'theme' || i.type === 'cosmetic' || i.type === 'title')
          .map((i) => { try { return (JSON.parse(i.payload) as { name?: string }).name ?? '' } catch { return '' } })
          .filter(Boolean)
      )
    } catch { /* proceed without dedup on failure */ }

    const result = rollLootDeduped(ownedNames, undefined, get().classEvolutionIndex)
    const id = `loot_${Date.now()}`

    if (result.focusInstead !== null) {
      // Duplicate cosmetic/theme — award Focus instead and persist to DB
      void api().shop.awardFocus('loot_duplicate', id, result.focusInstead)
      const focusId = `focus_dup_${Date.now()}`
      set((s) => ({
        pendingRewards: [...s.pendingRewards, { id: focusId, type: 'focus_earned', data: { amount: result.focusInstead } }]
      }))
      setTimeout(() => get().dismissReward(focusId), 2200)
      void import('./shop.store').then(({ useShopStore }) => {
        void useShopStore.getState().refreshBalance()
      })
      return
    }

    const loot = result.loot
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

  triggerQuestCompleted: (title: string, xpAwarded: number, focusAwarded = 0) => {
    const id = `quest_completed_${Date.now()}`
    const rewardsToAdd: PendingReward[] = [
      { id, type: 'quest_completed', data: { title, xpAwarded, focusAwarded } }
    ]

    if (focusAwarded > 0) {
      const focusId = `focus_quest_${Date.now()}`
      rewardsToAdd.push({ id: focusId, type: 'focus_earned', data: { amount: focusAwarded } })
      setTimeout(() => get().dismissReward(focusId), 2200)
      // Refresh shop balance so Focus total stays current
      void import('./shop.store').then(({ useShopStore }) => {
        void useShopStore.getState().refreshBalance()
      })
    }

    set((s) => ({ pendingRewards: [...s.pendingRewards, ...rewardsToAdd] }))
    setTimeout(() => get().dismissReward(id), 3500)
  },

  triggerTaskDone: (taskTitle: string, xpAwarded: number) => {
    const id = `task_done_${Date.now()}`
    set((s) => ({
      pendingRewards: [...s.pendingRewards, { id, type: 'task_done', data: { taskTitle, xpAwarded } }]
    }))
    setTimeout(() => get().dismissReward(id), 3200)
  },

  dismissReward: (id: string) => {
    set((s) => ({
      pendingRewards: s.pendingRewards.filter((r) => r.id !== id)
    }))
  }
}))
