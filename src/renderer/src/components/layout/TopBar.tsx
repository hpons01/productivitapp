import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Minus, Square, X } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification.store'
import { useSettingsStore } from '../../stores/settings.store'
import { useShopStore } from '../../stores/shop.store'
import { cn } from '../../lib/utils'

const CLASS_ICONS: Record<string, string> = {
  'Time Mage': '⚡',
  'Iron Warrior': '⚔️',
  'Zen Master': '🌿',
  'Arcane Scholar': '🧙',
  'Grand Tactician': '🎯',
  Apprentice: '🌱'
}

export function TopBar() {
  const [time, setTime] = useState(new Date())
  const [isMaximized, setIsMaximized] = useState(false)
  const isWindows = navigator.userAgent.includes('Windows')
  const { level, totalXP, characterClass } = useGamificationStore()
  const equippedTitle = useSettingsStore((s) => s.getSetting('equipped_title', ''))
  const { focusBalance } = useShopStore()

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isWindows) return

    const syncMaximizeState = async () => {
      const value = await window.api.window.isMaximized()
      setIsMaximized(Boolean(value))
    }

    void syncMaximizeState()
    window.addEventListener('resize', syncMaximizeState)
    return () => window.removeEventListener('resize', syncMaximizeState)
  }, [isWindows])

  const xpForCurrentLevel = Math.pow(level, 2) * 10
  const xpForNextLevel = Math.pow(level + 1, 2) * 10
  const xpProgress = Math.min(100, ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)
  const xpRemaining = Math.max(0, xpForNextLevel - totalXP)

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-surface-600 bg-surface-800/50 drag-region">
      {/* Left: date */}
      <div className="text-sm text-surface-400 no-drag">
        <span className="font-medium text-white">{format(time, 'EEEE')}</span>
        <span className="mx-2 opacity-40">·</span>
        <span>{format(time, 'MMMM d, yyyy')}</span>
      </div>

      {/* Center: XP bar */}
      <div className="flex items-center gap-3 no-drag">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-amber-400 font-bold">{CLASS_ICONS[characterClass]}</span>
          <span className="text-xs text-surface-400 font-medium">{characterClass}</span>
          {equippedTitle && (
            <span className="text-[10px] text-surface-500 italic">· {equippedTitle}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">LVL {level}</span>
          <div className="relative w-32 h-2 bg-surface-600 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 xp-bar rounded-full transition-all duration-700 ease-out"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-surface-400 font-mono">{xpRemaining} XP</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-xs text-amber-400 font-bold">{totalXP.toLocaleString()}</span>
          <span className="text-[10px] text-amber-500/60">XP</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <span className="text-xs text-cyan-400 font-bold">{focusBalance.toLocaleString()}</span>
          <span className="text-[10px] text-cyan-500/60">💎</span>
        </div>
      </div>

      {/* Right: time */}
      <div className="flex items-center gap-3 no-drag">
        <div className="text-sm font-mono text-white">
          {format(time, 'HH:mm:ss')}
        </div>
        {isWindows && (
          <div className="flex items-center gap-1">
            <button
              className="window-control-btn"
              onClick={() => void window.api.window.minimize()}
              aria-label="Minimize window"
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              className="window-control-btn"
              onClick={async () => {
                const result = (await window.api.window.toggleMaximize()) as { isMaximized?: boolean }
                setIsMaximized(Boolean(result?.isMaximized))
              }}
              aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square size={12} />
            </button>
            <button
              className="window-control-btn window-control-close"
              onClick={() => void window.api.window.close()}
              aria-label="Close window"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
