import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useGamificationStore } from '../../stores/gamification.store'
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
  const { level, totalXP, xpToNextLevel, characterClass } = useGamificationStore()

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

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
      </div>

      {/* Right: time */}
      <div className="text-sm font-mono text-white no-drag">
        {format(time, 'HH:mm:ss')}
      </div>
    </div>
  )
}
