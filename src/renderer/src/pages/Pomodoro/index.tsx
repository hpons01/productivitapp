import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, StopCircle, SkipForward, AlertCircle, Clock, Zap, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { cn, formatDuration } from '../../lib/utils'
import { format } from 'date-fns'
import { AmbientSoundPlayer } from '../../components/ambient/AmbientSoundPlayer'

const PRESETS = [
  { label: '25 / 5', work: 25, break: 5 },
  { label: '50 / 10', work: 50, break: 10 },
  { label: '90 / 15', work: 90, break: 15 },
  { label: '15 / 3', work: 15, break: 3 }
]

const STATUS_COLORS: Record<string, string> = {
  idle: 'text-[color:var(--app-muted)]',
  running: 'text-[color:var(--app-primary)]',
  paused: 'text-[color:var(--app-amber)]',
  break: 'text-[color:var(--app-ring-break,#3b82f6)]',
  completed: 'text-[color:var(--app-primary)]'
}

const STATUS_BG: Record<string, string> = {
  idle: 'from-surface-700 to-surface-800',
  running: 'from-primary-900/20 to-surface-800',
  paused: 'from-amber-900/20 to-surface-800',
  break: 'from-blue-900/20 to-surface-800',
  completed: 'from-primary-900/20 to-surface-800'
}

interface SessionRow {
  id: string
  label: string | null
  started_at: number
  duration_mins: number
  completed: number
  interruptions: number
  xp_awarded: number
}

export function PomodoroPage() {
  const {
    status, timeLeft, duration, breakDuration, sessionLabel,
    interruptions, todayPomodoros, todayMinutes, repetitionTarget, endlessMode, loopsCompletedInRun,
    start, pause, resume, tick, stop, endBreak,
    setLabel, increment, loadTodayStats,
    setRepetitionTarget, toggleEndlessMode,
    presets, loadPresets, createPreset, deletePreset, applyPreset
  } = usePomodoroStore()

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [customWork, setCustomWork] = useState(25)
  const [customBreak, setCustomBreak] = useState(5)
  const [showCustom, setShowCustom] = useState(false)
  const [presetError, setPresetError] = useState('')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const expectedTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    loadTodayStats()
    loadSessions()
    loadPresets()
  }, [])

  // Reload session list whenever a session completes
  useEffect(() => {
    if (status === 'break' || status === 'completed') {
      loadSessions()
    }
  }, [status])

  async function loadSessions() {
    try {
      const data = await window.api.pomodoro.list()
      setSessions((data as SessionRow[]).slice(0, 20))
    } catch {}
  }

  // Drift-corrected timer
  useEffect(() => {
    if (status === 'running' || status === 'break') {
      startTimeRef.current = Date.now()
      expectedTimeRef.current = Date.now() + 1000

      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const drift = now - expectedTimeRef.current
        expectedTimeRef.current = now + Math.max(0, 1000 - drift)
        tick()
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [status])

  // Tray events
  useEffect(() => {
    const unsub = window.api.onTrayStartPomodoro(() => start())
    return unsub
  }, [])

  const totalSeconds = (status === 'break' ? breakDuration : duration) * 60
  const progressPct = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 110
  const customPresets = presets.filter((preset) => preset.user_created === 1)

  async function handleSavePreset() {
    const workMins = Number(customWork)
    const breakMins = Number(customBreak)

    if (!Number.isInteger(workMins) || workMins < 1 || workMins > 240) {
      setPresetError('Work must be 1-240 minutes')
      return
    }

    if (!Number.isInteger(breakMins) || breakMins < 1 || breakMins > 120) {
      setPresetError('Break must be 1-120 minutes')
      return
    }

    try {
      await createPreset(workMins, breakMins)
      setPresetError('')
      setShowCustom(false)
      applyPreset(workMins, breakMins)
    } catch {
      setPresetError('Could not save preset')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Focus Timer</h1>
        <p className="page-subtitle">
          {todayPomodoros} sessions · {todayMinutes} min focused today
        </p>
      </div>

      {/* Main Timer Card */}
      <Card className={cn('bg-gradient-to-br transition-all duration-500', STATUS_BG[status])}>
        <CardContent className="py-8 flex flex-col items-center gap-6">
          {/* Session Label Input */}
          {status === 'idle' && (
            <input
              value={sessionLabel}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="What are you working on? (optional)"
              className="bg-surface-800/60 border border-surface-500 rounded-xl px-4 py-2.5 text-sm text-[color:var(--app-interactive-fg-default)] placeholder:text-[color:var(--app-interactive-fg-muted)] focus:outline-none focus:border-[color:var(--app-focus-ring)] w-full max-w-xs text-center"
            />
          )}

          {/* SVG Ring Timer */}
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 240 240" overflow="visible">
              {/* Track */}
              <circle cx="120" cy="120" r="110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              {/* Progress */}
              <motion.circle
                cx="120" cy="120" r="110"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * progressPct) / 100}
                style={{
                  color: status === 'break'
                    ? 'var(--app-ring-break, #3b82f6)'
                    : status === 'paused'
                    ? 'var(--app-amber)'
                    : 'var(--app-primary)',
                  filter: 'drop-shadow(0 0 8px currentColor)'
                }}
                transition={{ duration: 0.5 }}
              />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={cn('text-5xl font-mono font-bold tabular-nums', STATUS_COLORS[status])}>
                {formatDuration(timeLeft)}
              </div>
              <div className="text-xs text-surface-400 mt-2 capitalize">
                {status === 'break' ? '☕ Break' : status === 'running' ? '🎯 Focusing' : status === 'paused' ? '⏸ Paused' : status === 'completed' ? '🎉 Done!' : '🍅 Pomodoro'}
              </div>
              {status !== 'idle' && (
                <div className="text-[11px] text-surface-400 mt-1">
                  {endlessMode
                    ? `Endless enabled · loops done ${loopsCompletedInRun}`
                    : `Loops done ${Math.min(loopsCompletedInRun, repetitionTarget)} / ${repetitionTarget}`}
                </div>
              )}
              {status === 'running' && interruptions > 0 && (
                <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
                  <AlertCircle size={10} />
                  <span>{interruptions} interruptions</span>
                </div>
              )}
            </div>
          </div>

          {/* Session Label Display */}
          {sessionLabel && status !== 'idle' && (
            <div className="text-sm text-surface-300 font-medium">{sessionLabel}</div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {status === 'idle' && (
              <Button size="lg" onClick={() => start(sessionLabel)}>
                <Play size={18} /> Start Session
              </Button>
            )}
            {status === 'running' && (
              <>
                <Button variant="secondary" size="icon" onClick={pause}><Pause size={16} /></Button>
                <Button variant="secondary" size="icon" onClick={increment} title="Mark interruption">
                  <AlertCircle size={16} />
                </Button>
                <Button variant={endlessMode ? 'default' : 'secondary'} onClick={toggleEndlessMode}>
                  {endlessMode ? 'Endless On' : 'Endless'}
                </Button>
                <Button variant="danger" size="icon" onClick={() => void stop()}><StopCircle size={16} /></Button>
              </>
            )}
            {status === 'paused' && (
              <>
                <Button onClick={resume}><Play size={16} /> Resume</Button>
                <Button variant={endlessMode ? 'default' : 'secondary'} onClick={toggleEndlessMode}>
                  {endlessMode ? 'Endless On' : 'Endless'}
                </Button>
                <Button variant="danger" size="icon" onClick={() => void stop()}><StopCircle size={16} /></Button>
              </>
            )}
            {status === 'break' && (
              <>
                <Button onClick={() => void endBreak()}><SkipForward size={16} /> Skip Break</Button>
                <Button variant={endlessMode ? 'default' : 'secondary'} onClick={toggleEndlessMode}>
                  {endlessMode ? 'Endless On' : 'Endless'}
                </Button>
                <Button variant="danger" size="icon" onClick={() => void stop()}><StopCircle size={16} /></Button>
              </>
            )}
            {status === 'completed' && (
              <Button onClick={() => void usePomodoroStore.getState().endBreak()}>
                <Play size={16} /> Start Another
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      {status === 'idle' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Presets</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-surface-600 bg-surface-800/40 p-3">
              <label className="text-xs text-surface-300 block mb-2">Repetitions (work sessions total)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={repetitionTarget}
                  onChange={(e) => setRepetitionTarget(Number(e.target.value || 1))}
                  className="w-24 rounded-xl bg-surface-800 border border-surface-500 px-3 py-2 text-sm text-[color:var(--app-interactive-fg-default)] placeholder:text-[color:var(--app-interactive-fg-muted)] focus:outline-none focus:border-[color:var(--app-focus-ring)]"
                />
                <span className="text-xs text-surface-400">Each loop is counted when break ends or is skipped.</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex gap-2 flex-wrap flex-1">
                {PRESETS.map((preset) => {
                  const isSelected = duration === preset.work && breakDuration === preset.break
                  return (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset.work, preset.break)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-sm border transition-all',
                        isSelected
                          ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                          : 'bg-surface-800 border-surface-600 text-surface-300 hover:border-surface-400'
                      )}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setShowCustom((v) => !v)}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm border transition-all whitespace-nowrap ml-auto',
                  showCustom
                    ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                    : 'bg-surface-800 border-dashed border-surface-500 text-surface-300 hover:border-surface-400'
                )}
              >
                + Custom session
              </button>
            </div>

            {customPresets.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {customPresets.map((preset) => {
                  const isSelected = duration === preset.work_mins && breakDuration === preset.break_mins
                  return (
                    <div key={preset.id} className="flex items-center gap-1">
                      <button
                        onClick={() => applyPreset(preset.work_mins, preset.break_mins)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-sm border transition-all',
                          isSelected
                            ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                            : 'bg-surface-800 border-surface-600 text-surface-300 hover:border-surface-400'
                        )}
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-2 rounded-lg border border-surface-600 text-surface-300 hover:text-red-300 hover:border-red-500/40 transition-colors"
                        title="Delete preset"
                        aria-label={`Delete ${preset.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {showCustom && (
              <div className="rounded-xl border border-surface-600 bg-surface-800/50 p-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={customWork}
                    onChange={(e) => setCustomWork(Number(e.target.value || 0))}
                    placeholder="Work (min)"
                    className="w-full rounded-xl bg-surface-800 border border-surface-500 px-3 py-2 text-sm text-[color:var(--app-interactive-fg-default)] placeholder:text-[color:var(--app-interactive-fg-muted)] focus:outline-none focus:border-[color:var(--app-focus-ring)]"
                  />
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={customBreak}
                    onChange={(e) => setCustomBreak(Number(e.target.value || 0))}
                    placeholder="Break (min)"
                    className="w-full rounded-xl bg-surface-800 border border-surface-500 px-3 py-2 text-sm text-[color:var(--app-interactive-fg-default)] placeholder:text-[color:var(--app-interactive-fg-muted)] focus:outline-none focus:border-[color:var(--app-focus-ring)]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => applyPreset(customWork, customBreak)}>
                    Use custom session
                  </Button>
                  <Button size="sm" onClick={handleSavePreset}>Save preset</Button>
                  {presetError && <span className="text-xs text-red-400">{presetError}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Focus Sounds */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Focus Sounds</CardTitle></CardHeader>
        <CardContent>
          <AmbientSoundPlayer />
        </CardContent>
      </Card>

      {/* Today's sessions emoji tiles */}
      {todayPomodoros > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Today's Sessions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: todayPomodoros }).map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-lg bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-sm">
                  🍅
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock size={14} className="text-surface-400" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence initial={false}>
              {sessions.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm',
                    s.completed
                      ? 'bg-surface-800/40 border-surface-700/50'
                      : 'bg-surface-800/20 border-surface-700/30 opacity-50'
                  )}
                >
                  <span className="text-base shrink-0">{s.completed ? '🍅' : '💨'}</span>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[color:var(--app-interactive-fg-default)] truncate">
                      {s.label || <span className="text-surface-500 italic">Unlabeled</span>}
                    </div>
                    <div className="text-xs text-surface-400">
                      {format(new Date(s.started_at), 'MMM d · h:mm a')} · {s.duration_mins} min
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.interruptions > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                        <AlertCircle size={10} />{s.interruptions}
                      </span>
                    )}
                    {s.completed && s.xp_awarded > 0 && (
                      <span className="flex items-center gap-1 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
                        <Zap size={10} />+{s.xp_awarded}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
