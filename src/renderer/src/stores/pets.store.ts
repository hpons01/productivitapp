import { create } from 'zustand'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

export interface PetInstance {
  id: string
  definition_id: string
  egg_id: string | null
  name: string
  total_xp: number
  level: number
  obtained_at: number
  equipped: number
  // joined from pet_definitions
  icon: string
  rarity: string
  boosted_source: string | null
  bonus_rate: number
  flavor_text: string
  max_level: number
}

export interface EggInstance {
  id: string
  tier: string | null
  source_quest_id: string | null
  earned_at: number
  hatched_at: number | null
  pet_id: string | null
}

interface PetsState {
  pets: PetInstance[]
  eggs: EggInstance[]
  equippedPet: PetInstance | null
  loading: boolean
  hatchingEggId: string | null

  load: () => Promise<void>
  equipPet: (id: string) => Promise<void>
  unequipPet: () => Promise<void>
  hatchEgg: (eggId: string) => Promise<void>
  renamePet: (id: string, name: string) => Promise<void>
}

export const usePetsStore = create<PetsState>((set, get) => ({
  pets: [],
  eggs: [],
  equippedPet: null,
  loading: false,
  hatchingEggId: null,

  load: async () => {
    set({ loading: true })
    try {
      const [pets, eggs] = await Promise.all([
        api().pets.list() as Promise<PetInstance[]>,
        api().pets.eggs() as Promise<EggInstance[]>
      ])
      const equippedPet = pets.find((p) => p.equipped === 1) ?? null
      set({ pets, eggs, equippedPet })
    } catch (e) {
      console.error('Failed to load pets', e)
    }
    set({ loading: false })
  },

  equipPet: async (id: string) => {
    await api().pets.equip(id)
    await get().load()
  },

  unequipPet: async () => {
    await api().pets.unequip()
    await get().load()
  },

  hatchEgg: async (eggId: string) => {
    set({ hatchingEggId: eggId })
    try {
      const result = await api().pets.hatchEgg(eggId) as {
        success: boolean
        pet?: PetInstance
        egg?: EggInstance
      }

      if (result.success && result.pet) {
        // Push egg_hatch pending reward to the gamification overlay
        const rewardId = `egg_hatch_${Date.now()}`
        useGamificationStore.getState().dismissReward('__noop__') // ensure store is accessible
        useGamificationStore.setState((s) => ({
          pendingRewards: [
            ...s.pendingRewards,
            {
              id: rewardId,
              type: 'egg_hatch' as const,
              data: {
                eggId,
                petDefinitionId: result.pet!.definition_id,
                petName: result.pet!.name,
                rarity: result.pet!.rarity,
                petIcon: result.pet!.icon,
                flavorText: result.pet!.flavor_text,
                bonusSource: result.pet!.boosted_source,
                bonusRate: result.pet!.bonus_rate
              }
            }
          ]
        }))

        // Reload pets list to show the new pet
        await get().load()
      }
    } catch (e) {
      console.error('Failed to hatch egg', e)
    }
    set({ hatchingEggId: null })
  },

  renamePet: async (id: string, name: string) => {
    await api().pets.rename(id, name)
    set((s) => ({
      pets: s.pets.map((p) => (p.id === id ? { ...p, name } : p)),
      equippedPet: s.equippedPet?.id === id ? { ...s.equippedPet, name } : s.equippedPet
    }))
  }
}))
