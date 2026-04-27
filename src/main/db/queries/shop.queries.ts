import Database from 'better-sqlite3'
import { SHOP_CATALOG_BY_ID, generateDailyShop, ShopItem } from '../../domain/shop'

export interface FocusLogRow {
  id: string
  type: string
  source: string
  source_id: string | null
  amount: number
  balance: number
  logged_at: number
}

export interface ShopPurchaseRow {
  id: string
  date_seed: string
  item_id: string
  item_type: string
  focus_cost: number
  purchased_at: number
}

export interface ShopPurchaseResult {
  success: boolean
  error?: string
  newFocusBalance?: number
  item?: ShopItem
}

function parseUnlockedSetting(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return []
  }
}

function appendUnlockedSetting(
  db: Database.Database,
  key: 'unlocked_themes' | 'unlocked_accents',
  value: string
): void {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  const unlocked = parseUnlockedSetting(row?.value ?? '[]')

  if (!unlocked.includes(value)) {
    unlocked.push(value)
  }

  const now = Date.now()
  db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(JSON.stringify(unlocked), now, key)
}

// ── Balance ───────────────────────────────────────────────────────────────────

export function getFocusBalance(db: Database.Database): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as balance FROM focus_log')
    .get() as { balance: number }
  return row.balance
}

// ── Award Focus (internal — also called from other query files) ───────────────

export function awardFocus(
  db: Database.Database,
  source: string,
  sourceId: string,
  amount: number
): { newBalance: number; awarded: number } {
  if (amount <= 0) return { newBalance: getFocusBalance(db), awarded: 0 }

  const id = `focus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const tx = db.transaction(() => {
    const currentBalance = getFocusBalance(db)
    const newBalance = currentBalance + amount
    db.prepare(`
      INSERT INTO focus_log (id, type, source, source_id, amount, balance, logged_at, updated_at)
      VALUES (?, 'earn', ?, ?, ?, ?, ?, ?)
    `).run(id, source, sourceId, amount, newBalance, Date.now(), Date.now())
    return newBalance
  })

  const newBalance = tx() as number
  return { newBalance, awarded: amount }
}

// ── Spend Focus ───────────────────────────────────────────────────────────────

export function spendFocus(
  db: Database.Database,
  amount: number,
  source: string,
  sourceId: string
): { success: boolean; newBalance: number; error?: string } {
  const tx = db.transaction((): { success: boolean; newBalance: number; error?: string } => {
    const current = getFocusBalance(db)
    if (current < amount) {
      return { success: false, newBalance: current, error: 'Insufficient Focus' }
    }
    const id = `focus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const newBalance = current - amount
    db.prepare(`
      INSERT INTO focus_log (id, type, source, source_id, amount, balance, logged_at, updated_at)
      VALUES (?, 'spend', ?, ?, ?, ?, ?, ?)
    `).run(id, source, sourceId, -amount, newBalance, Date.now(), Date.now())
    return { success: true, newBalance }
  })

  return tx() as { success: boolean; newBalance: number; error?: string }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function getShopPurchasesForDate(db: Database.Database, dateSeed: string): ShopPurchaseRow[] {
  return db
    .prepare('SELECT * FROM shop_purchases WHERE date_seed = ? AND deleted_at IS NULL')
    .all(dateSeed) as ShopPurchaseRow[]
}

export function getFocusLog(db: Database.Database, limit = 50): FocusLogRow[] {
  return db
    .prepare('SELECT * FROM focus_log WHERE deleted_at IS NULL ORDER BY logged_at DESC LIMIT ?')
    .all(limit) as FocusLogRow[]
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export function purchaseShopItem(
  db: Database.Database,
  itemId: string,
  dateSeed: string
): ShopPurchaseResult {
  const item = SHOP_CATALOG_BY_ID[itemId]
  if (!item) return { success: false, error: 'Item not found in catalog.' }

  const todaysShop = generateDailyShop(dateSeed)
  if (!todaysShop.find((i) => i.id === itemId)) {
    return { success: false, error: "Item is not in today's shop." }
  }

  const tx = db.transaction((): ShopPurchaseResult => {
    // Idempotency: already purchased today?
    const alreadyPurchased = db
      .prepare('SELECT id FROM shop_purchases WHERE date_seed = ? AND item_id = ? AND deleted_at IS NULL')
      .get(dateSeed, itemId) as { id: string } | undefined
    if (alreadyPurchased) return { success: false, error: 'Already purchased today.' }

    // Deduct Focus
    const spendResult = spendFocus(db, item.focusCost, 'shop_purchase', `shop_${dateSeed}_${itemId}`)
    if (!spendResult.success) return { success: false, error: spendResult.error }

    // Record purchase
    const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    db.prepare(`
      INSERT INTO shop_purchases (id, date_seed, item_id, item_type, focus_cost, purchased_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(purchaseId, dateSeed, itemId, item.type, item.focusCost, Date.now(), Date.now())

    // Apply effect
    if (item.type === 'cosmetic') {
      if (item.cosmeticType === 'theme') {
        db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(item.cosmeticValue!, Date.now(), 'theme')
        appendUnlockedSetting(db, 'unlocked_themes', item.cosmeticValue!)
      } else if (item.cosmeticType === 'accent') {
        db.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?').run(item.cosmeticValue!, Date.now(), 'active_accent')
        appendUnlockedSetting(db, 'unlocked_accents', item.cosmeticValue!)
      } else if (item.cosmeticType === 'title') {
        db.prepare(`
          INSERT OR IGNORE INTO loot_inventory (id, type, tier, payload, earned_at, updated_at)
          VALUES (?, 'title', ?, ?, ?, ?)
        `).run(
          `shop_title_${itemId}_${Date.now()}`,
          item.rarity,
          JSON.stringify({ name: item.cosmeticValue, description: `Purchased from shop: ${item.name}` }),
          Date.now(),
          Date.now()
        )
      }
    } else if (item.type === 'egg') {
      // Award a mystery egg with the specified tier
      const eggId = `egg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const tier = item.eggTier ?? 'common'
      db.prepare(`
        INSERT INTO pet_eggs (id, tier, source_quest_id, earned_at, updated_at)
        VALUES (?, ?, NULL, ?, ?)
      `).run(eggId, tier, Date.now(), Date.now())
    } else if (item.type === 'potion') {
      db.prepare(`
        INSERT INTO loot_inventory (id, type, tier, payload, earned_at, updated_at)
        VALUES (?, 'power_up', ?, ?, ?, ?)
      `).run(
        `shop_potion_${purchaseId}`,
        item.rarity,
        JSON.stringify({
          name: item.name,
          description: item.description,
          effectType: item.effectType,
          effectDuration: item.effectDuration,
          effectMagnitude: item.effectMagnitude
        }),
        Date.now(),
        Date.now()
      )
    }

    return { success: true, newFocusBalance: spendResult.newBalance, item }
  })

  return tx() as ShopPurchaseResult
}
