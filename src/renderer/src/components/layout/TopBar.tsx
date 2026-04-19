import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Gem, Minus, Pause, Play, Square, StopCircle, X } from 'lucide-react'
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
    <div
      className="flex items-center justify-between px-5 py-2.5 border-b drag-region"
      style={{
        borderBottomColor: 'var(--app-glass-border)',
        background: 'var(--app-surface-800)',
        boxShadow: 'var(--shadow-inset)',
      }}
    >
      {/* Left: date as codex entry */}
      <div className="no-drag flex flex-col leading-none gap-0.5">
        <span className="text-[11px] font-[family:var(--font-display)] font-semibold text-[color:var(--app-primary)] tracking-[0.12em] uppercase leading-none">
          {format(time, 'EEEE')}
        </span>
        <span className="text-[9px] font-mono text-[color:var(--app-muted)] tabular-nums tracking-wider">
          {format(time, 'MMM d · yyyy')}
        </span>
      </div>

      {/* Center: character unit frame */}
      <div
        className="no-drag flex items-stretch gap-0 border rounded-sm overflow-hidden"
        style={{
          background: 'var(--app-surface-700)',
          borderColor: 'var(--app-unit-frame-border)',
          boxShadow: 'var(--shadow-inset)',
        }}
      >
        {/* Panel 1: Class portrait */}
        <div className="flex items-center gap-2 px-3 border-r border-primary-700/30">
          <span className="text-sm leading-none" aria-hidden="true">
            {CLASS_ICONS[characterClass] ?? '🌱'}
          </span>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-[11px] font-[family:var(--font-display)] font-semibold text-[color:var(--app-text)] uppercase tracking-wider leading-none">
              {characterClass}
            </span>
            {equippedTitle && (
              <span className="text-[8px] font-[family:var(--font-display)] text-amber-500/70 leading-none italic">
                {equippedTitle}
              </span>
            )}
          </div>
        </div>

        {/* Panel 2: XP ribbon */}
        <div className="flex items-center gap-2.5 px-3 border-r border-primary-700/30">
          <span className="text-[10px] font-mono font-black text-amber-300 tabular-nums">LV{level}</span>
          <div className="relative w-24 h-[5px] bg-surface-600 rounded-none overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 xp-bar transition-all duration-700 ease-out"
              style={{ width: `${xpProgress}%` }}
            />
            {/* Tactical tick marks */}
            <div className="absolute inset-y-0 left-1/4 w-px bg-black/40" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-black/40" />
            <div className="absolute inset-y-0 left-3/4 w-px bg-black/40" />
          </div>
          <span className="text-[9px] font-mono text-amber-600/70 tabular-nums">{xpRemaining}xp</span>
        </div>

        {/* Panel 3: Total XP */}
        <div className="flex items-center gap-1 px-3 border-r border-primary-700/30">
          <div className="flex flex-col items-end leading-none gap-0.5">
            <span className="text-[7px] font-[family:var(--font-display)] text-amber-600/60 uppercase tracking-[0.15em] leading-none">Total</span>
            <span className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
              {totalXP.toLocaleString()} <span className="text-amber-600/50">XP</span>
            </span>
          </div>
        </div>

        {/* Panel 4: Focus currency */}
        <div className="flex items-center gap-1.5 px-3">
          <Gem size={10} className="text-cyan-500/70" />
          <span className="text-[10px] font-mono font-bold text-cyan-400 tabular-nums">
            {focusBalance.toLocaleString()}
          </span>
          <span className="text-[9px] font-[family:var(--font-display)] text-cyan-700/70 uppercase tracking-wider">
            Focus
          </span>
        </div>
      </div>

      {/* Right: timer + clock + window controls */}
      <div className="flex items-center gap-2 no-drag">
        {hasActiveTimer && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-l-2 no-drag"
            style={{
              borderColor: 'var(--app-unit-frame-border)',
              borderLeftColor: status === 'break' ? 'var(--app-ring-break, #3b82f6)' : status === 'paused' ? 'var(--app-amber)' : 'var(--app-primary)',
              background: 'var(--app-unit-frame-bg)',
            }}
          >
            <span className="text-[9px] font-[family:var(--font-display)] font-semibold uppercase tracking-widest text-primary-300/80">
              {status === 'break' ? 'Break' : 'Focus'}
            </span>
            <span className="text-xs font-mono text-[color:var(--app-text)] font-bold tabular-nums">
              {formatTimer(timeLeft)}
            </span>
            {status === 'running' && (
              <button className="window-control-btn" onClick={pause} aria-label="Pause focus session" title="Pause">
                <Pause size={11} />
              </button>
            )}
            {status === 'paused' && (
              <button className="window-control-btn" onClick={resume} aria-label="Resume focus session" title="Resume">
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

        <div className="text-sm font-mono font-semibold text-[color:var(--app-interactive-fg-default)] tabular-nums">
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
