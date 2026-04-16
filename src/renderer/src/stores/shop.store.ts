import { create } from 'zustand'
import { format } from 'date-fns'

const api = () => window.api

export interface ShopItemClient {
  id: string
  type: 'potion' | 'cosmetic' | 'egg'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic'
  name: string
  description: string
  icon: string
  focusCost: number
  effectType?: string
  effectDuration?: number
  effectMagnitude?: number
  eggTier?: string
  cosmeticType?: string
  cosmeticValue?: string
}

interface ShopState {
  focusBalance: number
  dailyItems: ShopItemClient[]
  purchasedItemIds: Set<string>
  dateSeed: string
  loading: boolean
  purchasing: string | null

  load: () => Promise<void>
  purchase: (itemId: string) => Promise<{ success: boolean; error?: string; item?: ShopItemClient }>
  refreshBalance: () => Promise<void>
}

export const useShopStore = create<ShopState>((set, get) => ({
  focusBalance: 0,
  dailyItems: [],
  purchasedItemIds: new Set(),
  dateSeed: format(new Date(), 'yyyy-MM-dd'),
  loading: false,
  purchasing: null,

  load: async () => {
    set({ loading: true })
    try {
      const dateSeed = format(new Date(), 'yyyy-MM-dd')
      const [balance, shopData] = await Promise.all([
        api().shop.focusBalance() as Promise<number>,
        api().shop.dailyShop(dateSeed) as Promise<{
          items: ShopItemClient[]
          purchasedItemIds: string[]
        }>
      ])
      set({
        focusBalance: balance,
        dailyItems: shopData.items,
        purchasedItemIds: new Set(shopData.purchasedItemIds),
        dateSeed
      })
    } catch (e) {
      console.error('Failed to load shop', e)
    }
    set({ loading: false })
  },

  purchase: async (itemId: string) => {
    set({ purchasing: itemId })
    try {
      const result = (await api().shop.purchase(itemId, get().dateSeed)) as {
        success: boolean
        error?: string
        newFocusBalance?: number
        item?: ShopItemClient
      }
      if (result.success) {
        set((s) => ({
          focusBalance: result.newFocusBalance ?? s.focusBalance,
          purchasedItemIds: new Set([...s.purchasedItemIds, itemId])
        }))
      }
      return { success: result.success, error: result.error, item: result.item }
    } catch (e) {
      console.error('Failed to purchase item', e)
      return { success: false, error: 'Purchase failed' }
    } finally {
      set({ purchasing: null })
    }
  },

  refreshBalance: async () => {
    try {
      const balance = (await api().shop.focusBalance()) as number
      set({ focusBalance: balance })
    } catch (e) {
      console.error('Failed to refresh Focus balance', e)
    }
  }
}))
