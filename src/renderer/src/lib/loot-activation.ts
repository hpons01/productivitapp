import type { LootItem } from './science/rewards'

const THEME_MAP: Record<string, string> = {
  'Ember Theme': 'ember',
  'Ocean Theme': 'ocean',
  'Void Theme': 'void',
  'Golden Theme': 'golden'
}

const ACCENT_MAP: Record<string, string> = {
  'Bronze Accent': 'bronze',
  'Silver Accent': 'silver',
  'Gold Accent': 'gold'
}

const POWERUP_TYPE_MAP: Record<string, string> = {
  'Focus Potion': 'focus_potion',
  'Streak Shield': 'streak_shield',
  'Double XP Elixir': 'double_xp',
  'Time Warp': 'time_warp',
  'Long XP Tonic': 'xp_boost',
  'Long XP Elixir': 'xp_boost',
  'Long XP Infusion': 'xp_boost',
  'Long XP Overdrive': 'xp_boost'
}

interface PowerupConfig {
  type: string
  multiplier: number
  expires_at: number | null
  uses_left: number | null
}

const POWERUP_BASE: Record<string, Omit<PowerupConfig, 'expires_at'> & { expires_at: null }> = {
  'Focus Potion':  { type: 'focus_potion', multiplier: 1.25, expires_at: null, uses_left: 3 },
  'Streak Shield': { type: 'streak_shield', multiplier: 1,   expires_at: null, uses_left: 1 }
}

export function getThemeKeyFromLootName(name: string | undefined): string | undefined {
  if (!name) return undefined
  return THEME_MAP[name]
}

export function getPowerupTypeFromName(name: string | undefined): string | undefined {
  if (!name) return undefined
  return POWERUP_TYPE_MAP[name]
}

export function getAccentKeyFromLootName(name: string | undefined): string | undefined {
  if (!name) return undefined
  return ACCENT_MAP[name]
}

function parseUnlocked(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return []
  }
}

async function ensureUnlocked(
  key: 'unlocked_themes' | 'unlocked_accents',
  value: string,
  getSetting: ((key: string, defaultValue?: string) => string) | undefined,
  setSetting: (key: string, val: string) => Promise<void>
): Promise<void> {
  if (!getSetting) return

  const current = parseUnlocked(getSetting(key, '[]'))
  if (current.includes(value)) return

  await setSetting(key, JSON.stringify([...current, value]))
}

export async function activateLootItem(
  loot: Pick<LootItem, 'type'> & {
    name?: string
    effectType?: string
    effectDuration?: number
    effectMagnitude?: number
  },
  setSetting: (key: string, val: string) => Promise<void>,
  getSetting?: (key: string, defaultValue?: string) => string
): Promise<void> {
  switch (loot.type) {
    case 'title':
      if (!loot.name) return
      await setSetting('equipped_title', loot.name)
      break

    case 'theme': {
      const key = getThemeKeyFromLootName(loot.name)
      if (key) {
        await setSetting('theme', key)
        await ensureUnlocked('unlocked_themes', key, getSetting, setSetting)
      }
      break
    }

    case 'cosmetic': {
      const accentKey = getAccentKeyFromLootName(loot.name) ?? 'bronze'
      await setSetting('active_accent', accentKey)
      await ensureUnlocked('unlocked_accents', accentKey, getSetting, setSetting)
      break
    }

    case 'power_up': {
      let config: PowerupConfig | null = null
      const now = Date.now()

      if (loot.effectType === 'xp_boost' && typeof loot.effectMagnitude === 'number' && loot.effectMagnitude > 1) {
        const durationMinutes = Math.max(1, Math.round(loot.effectDuration ?? 360))
        config = {
          type: 'xp_boost',
          multiplier: loot.effectMagnitude,
          expires_at: now + durationMinutes * 60 * 1000,
          uses_left: null
        }
      } else if (loot.effectType === 'habit_boost' && typeof loot.effectMagnitude === 'number' && loot.effectMagnitude > 1) {
        const durationMinutes = Math.max(1, Math.round(loot.effectDuration ?? 120))
        config = {
          type: 'habit_boost',
          multiplier: loot.effectMagnitude,
          expires_at: now + durationMinutes * 60 * 1000,
          uses_left: null
        }
      }

      if (!config && loot.name && POWERUP_BASE[loot.name]) {
        config = { ...POWERUP_BASE[loot.name] }
      } else if (!config && loot.name === 'Double XP Elixir') {
        config = { type: 'double_xp', multiplier: 2, expires_at: now + 30 * 60 * 1000, uses_left: null }
      } else if (!config && loot.name === 'Time Warp') {
        config = { type: 'time_warp', multiplier: 3, expires_at: now + 60 * 60 * 1000, uses_left: null }
      } else if (!config && loot.name === 'Long XP Tonic') {
        config = { type: 'xp_boost', multiplier: 1.25, expires_at: now + 6 * 60 * 60 * 1000, uses_left: null }
      } else if (!config && loot.name === 'Long XP Elixir') {
        config = { type: 'xp_boost', multiplier: 1.5, expires_at: now + 6 * 60 * 60 * 1000, uses_left: null }
      } else if (!config && loot.name === 'Long XP Infusion') {
        config = { type: 'xp_boost', multiplier: 1.75, expires_at: now + 6 * 60 * 60 * 1000, uses_left: null }
      } else if (!config && loot.name === 'Long XP Overdrive') {
        config = { type: 'xp_boost', multiplier: 2, expires_at: now + 6 * 60 * 60 * 1000, uses_left: null }
      }

      if (config) {
        const existing = getSetting?.('active_powerup', '')
        if (existing) {
          try {
            const current = JSON.parse(existing) as PowerupConfig
            const now = Date.now()
            const isExpired = current.expires_at !== null && now > current.expires_at
            const isDepleted = current.uses_left !== null && current.uses_left <= 0
            if (!isExpired && !isDepleted) {
              // Queue it: store as powerup_queue array
              const queueRaw = getSetting?.('powerup_queue', '[]') ?? '[]'
              let queue: PowerupConfig[] = []
              try { queue = JSON.parse(queueRaw) as PowerupConfig[] } catch { queue = [] }
              queue.push(config)
              await setSetting('powerup_queue', JSON.stringify(queue))
              break
            }
          } catch { /* fall through and overwrite */ }
        }
        await setSetting('active_powerup', JSON.stringify(config))
      }
      break
    }
  }
}
