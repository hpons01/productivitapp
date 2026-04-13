import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Timer, CheckSquare, Zap, Trophy, Sunrise, Target, Swords } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Button } from '../../components/ui/button'
import { useGamificationStore } from '../../stores/gamification.store'
import { useHabitsStore } from '../../stores/habits.store'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { useJournalStore } from '../../stores/journal.store'
import { levelFromXP, xpForLevel } from '../../lib/science/xp'
import { cn } from '../../lib/utils'
import { format } from 'date-fns'

const api = () => window.api

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
}

const CLASS_ICONS: Record<string, string> = {
  'Time Mage': '⚡', 'Iron Warrior': '⚔️', 'Zen Master': '🌿',
  'Arcane Scholar': '🧙', 'Grand Tactician': '🎯', 'Apprentice': '🌱'
}

export function DashboardPage() {
  const gami = useGamificationStore()
  const habits = useHabitsStore()
  const pomodoro = usePomodoroStore()
  const journal = useJournalStore()
  const [dashStats, setDashStats] = useState<Record<string, number>>({})
  const [weeklyBoss, setWeeklyBoss] = useState<{ name: string; max_hp: number; current_hp: number; defeated: number } | null>(null)
  const [dailyQuests, setDailyQuests] = useState<Array<{ id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number }>>([])

  useEffect(() => {
    Promise.all([habits.load(), journal.loadToday(), pomodoro.loadTodayStats()])

    api().analytics.dashboard().then((stats: Record<string, unknown>) => {
      setDashStats({
        pomodorosToday: stats.pomodorosToday as number,
        habitsCompletedToday: stats.habitsCompletedToday as number,
        totalHabits: stats.totalHabits as number,
        tasksCompletedToday: stats.tasksCompletedToday as number
      })
      setWeeklyBoss(stats.weeklyBoss as { name: string; max_hp: number; current_hp: number; defeated: number } | null)
      setDailyQuests(stats.dailyQuests as Array<{ id: string; quest_type: string; description: string; target: number; progress: number; completed: number; xp_reward: number }> || [])
    })
  }, [])

  const xpProgress = levelFromXP(gami.totalXP)
  const xpCurrent = xpForLevel(xpProgress)
  const xpNext = xpForLevel(xpProgress + 1)
  const progressPct = Math.min(100, ((gami.totalXP - xpCurrent) / (xpNext - xpCurrent)) * 100)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
      {/* Header greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-white">
          {new Date().getHours() < 12 ? '🌅 Good morning' : new Date().getHours() < 17 ? '☀️ Good afternoon' : '🌙 Good evening'}
          , Hero
        </h1>
        <p className="text-surface-400 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d')}</p>
      </motion.div>

      {/* Character Card + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Character Card */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="h-full bg-gradient-to-br from-primary-900/40 to-surface-700 border-primary-600/20">
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary-600/30 border border-primary-500/30 flex items-center justify-center text-3xl">
                  {CLASS_ICONS[gami.characterClass] || '🌱'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-white">{gami.characterClass}</div>
                  <div className="text-xs text-surface-400 mt-0.5">Level {gami.level} Hero</div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-amber-400 font-bold">XP {gami.totalXP.toLocaleString()}</span>
                      <span className="text-surface-400">{Math.max(0, xpNext - gami.totalXP)} to next</span>
                    </div>
                    <Progress value={progressPct} variant="xp" size="sm" />
                  </div>
                </div>
              </div>

              {/* Stats radar */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {[
                  { label: 'Focus', value: gami.focusPower, color: 'text-blue-400' },
                  { label: 'Discipline', value: gami.discipline, color: 'text-red-400' },
                  { label: 'Vitality', value: gami.vitality, color: 'text-emerald-400' },
                  { label: 'Wisdom', value: gami.wisdom, color: 'text-yellow-400' }
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-surface-800/60 rounded-xl p-2.5">
                    <div className="text-[10px] text-surface-400 uppercase tracking-wide">{label}</div>
                    <div className={cn('text-lg font-bold', color)}>{value}</div>
                    <Progress value={value} size="sm" className="mt-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today's Stats */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full">
            {[
              {
                icon: CheckSquare, label: 'Habits', color: 'text-emerald-400',
                value: `${dashStats.habitsCompletedToday || 0}/${dashStats.totalHabits || 0}`,
                to: '/habits'
              },
              {
                icon: Timer, label: 'Pomodoros', color: 'text-blue-400',
                value: String(dashStats.pomodorosToday || 0),
                to: '/pomodoro'
              },
              {
                icon: Target, label: 'Tasks Done', color: 'text-purple-400',
                value: String(dashStats.tasksCompletedToday || 0),
                to: '/tasks'
              },
              {
                icon: Sunrise, label: 'Ritual', color: 'text-amber-400',
                value: journal.todayMorning ? '✅' : '—',
                to: '/journal'
              }
            ].map(({ icon: Icon, label, color, value, to }) => (
              <Link key={label} to={to} className="block">
                <Card className="h-full hover:border-surface-400/50 transition-colors cursor-pointer">
                  <CardContent className="pt-4 pb-3 flex flex-col items-center text-center gap-2">
                    <Icon size={22} className={color} />
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs text-surface-400">{label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Middle Row: Habits Today + Pomodoro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Habits Quick View */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Habits</CardTitle>
                <Link to="/habits" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {habits.habits.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-surface-400 text-sm">No habits yet.</p>
                  <Link to="/habits">
                    <Button size="sm" variant="secondary" className="mt-3">Add Habits</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {habits.habits.slice(0, 5).map((habit) => (
                    <div
                      key={habit.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        habit.completedToday
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-surface-800/40 border-surface-600/30'
                      )}
                    >
                      <span className="text-xl">{habit.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium truncate', habit.completedToday ? 'text-emerald-300 line-through opacity-70' : 'text-white')}>
                          {habit.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-surface-400">
                            {habit.streak > 0 && <><span className="streak-flame">🔥</span> {habit.streak}d streak</>}
                          </span>
                          {habit.isLegendary && <span className="text-[10px] text-amber-400 font-bold ml-1">LEGENDARY</span>}
                        </div>
                      </div>
                      {habit.completedToday && <span className="text-emerald-400 text-lg">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Timer or Start Prompt */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Focus Timer</CardTitle>
            </CardHeader>
            <CardContent>
              {pomodoro.status === 'idle' ? (
                <div className="text-center py-4">
                  <div className="text-5xl mb-3">⏱️</div>
                  <p className="text-surface-400 text-sm mb-4">Start a Pomodoro session to enter deep work mode.</p>
                  <Link to="/pomodoro">
                    <Button>Start Focus Session</Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className={cn(
                    'text-5xl font-mono font-bold mb-2',
                    pomodoro.status === 'running' ? 'text-emerald-400' : 'text-amber-400'
                  )}>
                    {String(Math.floor(pomodoro.timeLeft / 60)).padStart(2, '0')}:
                    {String(pomodoro.timeLeft % 60).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-surface-400 mb-1">{pomodoro.sessionLabel || 'Focus Session'}</div>
                  <div className="text-xs text-surface-500">
                    {pomodoro.status === 'running' ? '🟢 In progress' : pomodoro.status === 'break' ? '☕ Break time' : '⏸ Paused'}
                  </div>
                  <Link to="/pomodoro" className="block mt-4">
                    <Button size="sm" variant="secondary">Open Timer →</Button>
                  </Link>
                </div>
              )}
              {pomodoro.todayPomodoros > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-600 text-center text-xs text-surface-400">
                  {pomodoro.todayPomodoros} sessions · {pomodoro.todayMinutes} min focused today
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Daily Quests + Weekly Boss */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Quests */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={16} className="text-primary-400" />
                Daily Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dailyQuests.length === 0 ? (
                <p className="text-surface-400 text-sm text-center py-4">Quests loading...</p>
              ) : (
                <div className="space-y-3">
                  {dailyQuests.map((q) => {
                    const isRecovery = q.quest_type === 'streak_recovery'
                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'p-3 rounded-xl border',
                          q.completed
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : isRecovery
                              ? 'bg-amber-500/10 border-amber-500/40'
                              : 'bg-surface-800/40 border-surface-600/30'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={cn(
                            'text-sm font-medium',
                            q.completed ? 'text-emerald-300 line-through opacity-60' : isRecovery ? 'text-amber-300' : 'text-white'
                          )}>
                            {isRecovery && !q.completed && <span className="mr-1">🔥</span>}
                            {q.description}
                          </span>
                          <span className={cn('text-xs font-bold shrink-0', isRecovery ? 'text-amber-300' : 'text-amber-400')}>
                            +{q.xp_reward} XP
                          </span>
                        </div>
                        <Progress value={q.progress} max={q.target} size="sm" />
                        <div className="text-[10px] text-surface-400 mt-1">{q.progress}/{q.target}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Boss */}
        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-red-900/20 to-surface-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords size={16} className="text-red-400" />
                Weekly Boss
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyBoss ? (
                <div>
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">👹</div>
                    <div className="font-bold text-white">{weeklyBoss.name}</div>
                    {weeklyBoss.defeated ? (
                      <div className="text-emerald-400 text-sm mt-1">✅ Defeated! Claim your loot.</div>
                    ) : (
                      <div className="text-red-400 text-sm mt-1">⚔️ Deal damage by completing habits & pomodoros!</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-surface-400">Boss HP</span>
                      <span className="text-red-400 font-bold">{weeklyBoss.current_hp}/{weeklyBoss.max_hp}</span>
                    </div>
                    <Progress value={weeklyBoss.max_hp - weeklyBoss.current_hp} max={weeklyBoss.max_hp} variant="hp" size="md" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-surface-400 text-sm">No boss this week yet...</div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
