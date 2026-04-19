import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Minus, Pause, Play, Square, StopCircle, X } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification.store'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { useSettingsStore } from '../../stores/settings.store'
import { useShopStore } from '../../stores/shop.store'

const CLASS_ICONS: Record<string, string> = {
  'Time Mage': '⚡',
  'Iron Warrior': '⚔️',
  'Zen Master': '🌿',
  'Arcane Scholar': '🧙',
  'Grand Tactician': '🎯',
  Apprentice: '🌱'
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function TopBar() {
  const [time, setTime] = useState(new Date())
  const [isMaximized, setIsMaximized] = useState(false)
  const isWindows = navigator.userAgent.includes('Windows')
  const { level, totalXP, characterClass } = useGamificationStore()
  const { status, timeLeft, pause, resume, stop, endBreak } = usePomodoroStore()
  const equippedTitle = useSettingsStore((s) => s.getSetting('equipped_title', ''))
  const { focusBalance, refreshBalance } = useShopStore()

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

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
  const hasActiveTimer = status === 'running' || status === 'paused' || status === 'break'

  return (
    <div className="flex items-center justify-between px-5 py-2 border-b border-[color:var(--app-sidebar-border)] bg-surface-800/30 backdrop-blur-md drag-region" style={{ borderBottomColor: 'var(--app-glass-border)' }}>
      {/* Left: date with typographic hierarchy */}
      <div className="no-drag flex flex-col leading-tight">
        <span className="text-xs font-semibold text-[color:var(--app-text)] tracking-tight">
          {format(time, 'EEEE')}
        </span>
        <span className="text-[10px] font-ui text-[color:var(--app-muted)] tabular-nums">
          {format(time, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Center: unified pill container */}
      <div className="no-drag flex items-center gap-0 bg-surface-700/40 border border-surface-600/50 rounded-2xl px-3 py-1.5">
        {/* Class icon + name + title */}
        <div className="flex items-center gap-1.5 pr-3 border-r border-surface-600/50">
          <span className="text-sm leading-none">{CLASS_ICONS[characterClass]}</span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[10px] font-semibold text-[color:var(--app-text)] leading-none">
              {characterClass}
            </span>
            {equippedTitle && (
              <span className="text-[9px] text-[color:var(--app-muted)] leading-none italic">
                {equippedTitle}
              </span>
            )}
          </div>
        </div>

        {/* Level + XP bar + remaining */}
        <div className="flex items-center gap-2 px-3 border-r border-surface-600/50">
          <span className="text-[10px] font-ui font-bold text-amber-400 tabular-nums">LV{level}</span>
          <div className="relative w-28 h-1.5 bg-surface-600 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 xp-bar rounded-full transition-all duration-700 ease-out"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <span className="text-[9px] font-ui text-[color:var(--app-muted)] tabular-nums">{xpRemaining}xp</span>
        </div>

        {/* Total XP */}
        <div className="flex items-center gap-1 px-3 border-r border-surface-600/50">
          <span className="text-[10px] font-ui font-bold text-amber-400 tabular-nums">
            {totalXP.toLocaleString()}
          </span>
          <span className="text-[9px] text-amber-500/50 font-ui">XP</span>
        </div>

        {/* Focus balance */}
        <div className="flex items-center gap-1 pl-3">
          <span className="text-[10px] font-ui font-bold text-cyan-400 tabular-nums">
            {focusBalance.toLocaleString()}
          </span>
          <span className="text-[10px] leading-none">💎</span>
        </div>
      </div>

      {/* Right: timer + clock + window controls */}
      <div className="flex items-center gap-2 no-drag">
        {hasActiveTimer && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-primary-500/25 bg-primary-500/10 no-drag">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary-300/80">
              {status === 'break' ? 'Break' : 'Focus'}
            </span>
            <span className="text-xs font-ui text-[color:var(--app-text)] font-bold tabular-nums">
              {formatTimer(timeLeft)}
            </span>
            {status === 'running' && (
              <button
                className="window-control-btn"
                onClick={pause}
                aria-label="Pause focus session"
                title="Pause"
              >
                <Pause size={11} />
              </button>
            )}
            {status === 'paused' && (
              <button
                className="window-control-btn"
                onClick={resume}
                aria-label="Resume focus session"
                title="Resume"
              >
                <Play size={11} />
              </button>
            )}
            {status === 'break' && (
              <button
                className="window-control-btn"
                onClick={() => void endBreak()}
                aria-label="Skip break"
                title="Skip break"
              >
                <Play size={11} />
              </button>
            )}
            <button
              className="window-control-btn window-control-close"
              onClick={() => void stop()}
              aria-label="Stop focus session"
              title="Stop"
            >
              <StopCircle size={11} />
            </button>
          </div>
        )}

        <div className="text-sm font-ui font-medium text-[color:var(--app-interactive-fg-default)] tabular-nums">
          {format(time, 'HH:mm:ss')}
        </div>

        {isWindows && <div className="w-px h-4 bg-surface-600/60 mx-1" />}

        {isWindows && (
          <div className="flex items-center gap-1">
            <button
              className="window-control-btn"
              onClick={() => void window.api.window.minimize()}
              aria-label="Minimize window"
              title="Minimize"
            >
              <Minus size={13} />
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
              <Square size={11} />
            </button>
            <button
              className="window-control-btn window-control-close"
              onClick={() => void window.api.window.close()}
              aria-label="Close window"
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
