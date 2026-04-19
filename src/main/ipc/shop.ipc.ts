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

const DATE_SEED_RE = /^\d{4}-\d{2}-\d{2}$/

export function registerShopIpc(): void {
  ipcMain.handle('shop:focusBalance', () => {
    return getFocusBalance(getDb())
  })

  ipcMain.handle('shop:dailyShop', (_event, dateSeed: string) => {
    if (!DATE_SEED_RE.test(dateSeed)) throw new Error('Invalid date seed format')
    const db = getDb()
    const items = generateDailyShop(dateSeed)
    const purchases = getShopPurchasesForDate(db, dateSeed)
    return { items, purchasedItemIds: purchases.map((p) => p.item_id) }
  })

  ipcMain.handle('shop:purchase', (_event, itemId: string, dateSeed: string) => {
    if (!itemId || typeof itemId !== 'string') throw new Error('itemId required')
    if (!DATE_SEED_RE.test(dateSeed)) throw new Error('Invalid date seed format')
    return purchaseShopItem(getDb(), itemId, dateSeed)
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
}
