import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, StopCircle, SkipForward, AlertCircle, Clock, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { cn, formatDuration } from '../../lib/utils'
import { format } from 'date-fns'

const PRESETS = [
  { label: '25 / 5', work: 25, break: 5 },
  { label: '50 / 10', work: 50, break: 10 },
  { label: '90 / 15', work: 90, break: 15 },
  { label: '15 / 3', work: 15, break: 3 }
]

const STATUS_COLORS: Record<string, string> = {
  idle: 'text-surface-400',
  running: 'text-emerald-400',
  paused: 'text-amber-400',
  break: 'text-blue-400',
  completed: 'text-purple-400'
}

const STATUS_BG: Record<string, string> = {
  idle: 'from-surface-700 to-surface-800',
  running: 'from-emerald-900/20 to-surface-800',
  paused: 'from-amber-900/20 to-surface-800',
  break: 'from-blue-900/20 to-surface-800',
  completed: 'from-purple-900/20 to-surface-800'
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
    interruptions, todayPomodoros, todayMinutes,
    start, pause, resume, tick, complete, abandon, startBreak, endBreak,
    setLabel, increment, loadTodayStats
  } = usePomodoroStore()

  const [sessions, setSessions] = useState<SessionRow[]>([])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const expectedTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    loadTodayStats()
    loadSessions()
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Focus Timer</h1>
        <p className="text-surface-400 text-sm mt-1">
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
              className="bg-surface-800/60 border border-surface-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500 w-full max-w-xs text-center"
            />
          )}

          {/* SVG Ring Timer */}
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
              {/* Track */}
              <circle cx="120" cy="120" r="110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              {/* Progress */}
              <motion.circle
                cx="120" cy="120" r="110"
                fill="none"
                stroke={
                  status === 'break' ? '#3b82f6'
                  : status === 'paused' ? '#f59e0b'
                  : '#7c3aed'
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * progressPct) / 100}
                style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
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
                <Button variant="danger" size="icon" onClick={abandon}><StopCircle size={16} /></Button>
              </>
            )}
            {status === 'paused' && (
              <>
                <Button onClick={resume}><Play size={16} /> Resume</Button>
                <Button variant="danger" size="icon" onClick={abandon}><StopCircle size={16} /></Button>
              </>
            )}
            {status === 'break' && (
              <>
                <Button onClick={endBreak}><SkipForward size={16} /> Skip Break</Button>
              </>
            )}
            {status === 'completed' && (
              <Button onClick={() => usePomodoroStore.getState().endBreak()}>
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
          <CardContent className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  usePomodoroStore.setState({ duration: p.work, breakDuration: p.break, timeLeft: p.work * 60 })
                }}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm border transition-all',
                  duration === p.work
                    ? 'bg-primary-600/20 border-primary-500/40 text-primary-300'
                    : 'bg-surface-800 border-surface-600 text-surface-300 hover:border-surface-400'
                )}
              >
                {p.label}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

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
                    <div className="font-medium text-white truncate">
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
