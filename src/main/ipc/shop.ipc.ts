import { ipcMain } from 'electron'
import { getDb } from '../db'
import {
  getFocusBalance,
  getShopPurchasesForDate,
  purchaseShopItem,
  getFocusLog,
  awardFocus
} from '../db/queries/shop.queries'
import { generateDailyShop } from '../domain/shop'
import { damageBoss, getOrCreateWeeklyBoss } from '../db/queries/gamification.queries'
import { getSetting, setSetting } from '../db/queries/settings.queries'

const DATE_SEED_RE = /^\d{4}-\d{2}-\d{2}$/
const SHOP_REROLL_KEY = 'shop_reroll_state'

function getShopRerollIndex(db: ReturnType<typeof getDb>, dateSeed: string): number {
  const raw = getSetting(db, SHOP_REROLL_KEY)
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw) as { dateSeed?: string; index?: number }
    if (parsed.dateSeed !== dateSeed) return 0
    return Number.isInteger(parsed.index) ? Math.max(0, parsed.index ?? 0) : 0
  } catch {
    return 0
  }
}

function setShopRerollIndex(db: ReturnType<typeof getDb>, dateSeed: string, index: number): void {
  const safeIndex = Number.isInteger(index) ? Math.max(0, index) : 0
  setSetting(db, SHOP_REROLL_KEY, JSON.stringify({ dateSeed, index: safeIndex }))
}

function filterPurchasedForItems(items: { id: string }[], purchasedItemIds: string[]): string[] {
  const itemSet = new Set(items.map((item) => item.id))
  return purchasedItemIds.filter((id) => itemSet.has(id))
}

export function registerShopIpc(): void {
  ipcMain.handle('shop:focusBalance', () => {
    return getFocusBalance(getDb())
  })

  ipcMain.handle('shop:dailyShop', (_event, dateSeed: string) => {
    if (!DATE_SEED_RE.test(dateSeed)) throw new Error('Invalid date seed format')
    const db = getDb()
    const rerollIndex = getShopRerollIndex(db, dateSeed)
    const items = generateDailyShop(dateSeed, rerollIndex)
    const purchases = getShopPurchasesForDate(db, dateSeed)
    const purchasedItemIds = filterPurchasedForItems(items, purchases.map((p) => p.item_id))
    return { items, purchasedItemIds }
  })

  ipcMain.handle('shop:purchase', (_event, itemId: string, dateSeed: string) => {
    if (!itemId || typeof itemId !== 'string') throw new Error('itemId required')
    if (!DATE_SEED_RE.test(dateSeed)) throw new Error('Invalid date seed format')
    const db = getDb()
    const rerollIndex = getShopRerollIndex(db, dateSeed)
    return purchaseShopItem(db, itemId, dateSeed, rerollIndex)
  })

  ipcMain.handle('shop:reroll', (_event, dateSeed: string) => {
    if (!DATE_SEED_RE.test(dateSeed)) throw new Error('Invalid date seed format')
    const db = getDb()
    const currentIndex = getShopRerollIndex(db, dateSeed)
    const nextIndex = currentIndex + 1
    setShopRerollIndex(db, dateSeed, nextIndex)
    const items = generateDailyShop(dateSeed, nextIndex)
    const purchases = getShopPurchasesForDate(db, dateSeed)
    const purchasedItemIds = filterPurchasedForItems(items, purchases.map((p) => p.item_id))
    return { items, purchasedItemIds }
  })

  ipcMain.handle('shop:awardFocus', (_event, source: string, sourceId: string, amount: number) => {
    if (typeof amount !== 'number' || amount <= 0) return { success: false }
    const result = awardFocus(getDb(), source, sourceId, amount)
    return { success: true, newBalance: result.newBalance }
  })

  ipcMain.handle('shop:focusLog', (_event, limit = 50) => {
    const parsedLimit = Number(limit)
    const safeLimit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(500, parsedLimit)) : 50
    return getFocusLog(getDb(), safeLimit)
  })

  ipcMain.handle('shop:activateBossBait', () => {
    const db = getDb()
    const boss = getOrCreateWeeklyBoss(db)
    if (boss.defeated) return { success: false, error: 'Boss already defeated.' }
    const result = damageBoss(db, 100)
    return { success: true, current_hp: result.current_hp, defeated: result.defeated }
  })

  ipcMain.handle('shop:activateHabitShield', () => {
    const db = getDb()
    const shield = { type: 'streak_shield', multiplier: 1, expires_at: null, uses_left: 1 }
    const existing = db.prepare("SELECT value FROM settings WHERE key = 'active_powerup'").get() as { value: string } | undefined
    if (existing?.value) {
      try {
        const current = JSON.parse(existing.value) as { type: string; uses_left: number | null; expires_at: number | null }
        const now = Date.now()
        const isExpired = current.expires_at !== null && now > current.expires_at
        const isDepleted = current.uses_left !== null && current.uses_left <= 0
        if (!isExpired && !isDepleted) {
          const queueRaw = db.prepare("SELECT value FROM settings WHERE key = 'powerup_queue'").get() as { value: string } | undefined
          let queue = []
          try { queue = JSON.parse(queueRaw?.value ?? '[]') } catch { queue = [] }
          queue.push(shield)
          setSetting(db, 'powerup_queue', JSON.stringify(queue))
          return { success: true, queued: true }
        }
      } catch { /* fall through */ }
    }
    setSetting(db, 'active_powerup', JSON.stringify(shield))
    return { success: true, queued: false }
  })
}
