import type { LootItem } from './science/rewards'

const THEME_MAP: Record<string, string> = {
  'Ocean Theme': 'ocean',
  'Void Theme': 'void',
  'Golden Theme': 'golden'
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

export async function activateLootItem(
  loot: LootItem & { name: string },
  setSetting: (key: string, val: string) => Promise<void>
): Promise<void> {
  switch (loot.type) {
    case 'title':
      await setSetting('equipped_title', loot.name)
      break

    case 'theme': {
      const key = THEME_MAP[loot.name]
      if (key) await setSetting('theme', key)
      break
    }

    case 'cosmetic':
      await setSetting('active_accent', 'bronze')
      break

    case 'power_up': {
      let config: PowerupConfig | null = null
      const now = Date.now()

      if (POWERUP_BASE[loot.name]) {
        config = { ...POWERUP_BASE[loot.name] }
      } else if (loot.name === 'Double XP Elixir') {
        config = { type: 'double_xp', multiplier: 2, expires_at: now + 30 * 60 * 1000, uses_left: null }
      } else if (loot.name === 'Time Warp') {
        config = { type: 'time_warp', multiplier: 3, expires_at: now + 60 * 60 * 1000, uses_left: null }
      }

      if (config) await setSetting('active_powerup', JSON.stringify(config))
      break
    }
  }
}
