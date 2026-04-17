import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Timer, CheckSquare, Sunrise, Target, Swords } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Button } from '../../components/ui/button'
import { useHabitsStore } from '../../stores/habits.store'
import { usePomodoroStore } from '../../stores/pomodoro.store'
import { useJournalStore } from '../../stores/journal.store'
import { useSettingsStore } from '../../stores/settings.store'
import { cn } from '../../lib/utils'
import { format } from 'date-fns'

const api = () => window.api

type DashboardActiveQuest = {
  id: string
  source: 'daily' | 'catalog'
  title: string
  description: string
  target: number
  progress: number
  xpReward: number
  eggRewardTier: string | null
  status: 'enrolled' | 'active'
}

const CORE_VALUE_META: Record<string, { label: string; icon: string; cue: string }> = {
  health: { label: 'Health', icon: '🫀', cue: 'Protect your energy with focused, sustainable effort today.' },
  growth: { label: 'Growth', icon: '🌱', cue: 'Every completed action is another level gained.' },
  discipline: { label: 'Discipline', icon: '🛡️', cue: 'Choose what matters, especially when motivation dips.' },
  freedom: { label: 'Freedom', icon: '🕊️', cue: 'Your systems are buying back future time and choice.' },
  family: { label: 'Family', icon: '🏠', cue: 'Consistency here helps you show up better for your people.' },
  mastery: { label: 'Mastery', icon: '🎯', cue: 'Practice with intent and your craft will compound.' },
  impact: { label: 'Impact', icon: '🌍', cue: "Today's output can create value beyond yourself." },
  calm: { label: 'Calm', icon: '🧘', cue: 'Slow is smooth, smooth is fast. Keep the pace grounded.' }
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
}

export function DashboardPage() {
  const habits = useHabitsStore()
  const pomodoro = usePomodoroStore()
  const journal = useJournalStore()
  const { getSetting } = useSettingsStore()
  const [dashStats, setDashStats] = useState<Record<string, number>>({})
  const [weeklyBoss, setWeeklyBoss] = useState<{ name: string; max_hp: number; current_hp: number; defeated: number } | null>(null)
  const [activeQuests, setActiveQuests] = useState<DashboardActiveQuest[]>([])
  const [activeQuestsLoading, setActiveQuestsLoading] = useState(true)
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null)

  const refreshDashboardStats = async () => {
    const stats = await api().analytics.dashboard() as Record<string, unknown>
    setDashStats({
      pomodorosToday: stats.pomodorosToday as number,
      habitsCompletedToday: stats.habitsCompletedToday as number,
      totalHabits: stats.totalHabits as number,
      tasksCompletedToday: stats.tasksCompletedToday as number
    })
    setWeeklyBoss(stats.weeklyBoss as { name: string; max_hp: number; current_hp: number; defeated: number } | null)
  }

  const refreshActiveQuests = async () => {
    setActiveQuestsLoading(true)
    try {
      await api().quests.refresh()
      const [dailyData, catalogData] = await Promise.all([
        api().quests.list(),
        api().quests.catalog()
      ])

      const dailyActive = (dailyData as Array<{
        id: string
        quest_type: string
        description: string
        target: number
        progress: number
        xp_reward: number
        egg_reward_tier: string | null
        status: string
      }>)
        .filter((q) => q.status === 'enrolled' || q.status === 'active')
        .map((q) => ({
          id: `daily:${q.id}`,
          source: 'daily' as const,
          title: q.quest_type.replace(/_/g, ' '),
          description: q.description,
          target: q.target,
          progress: q.progress,
          xpReward: q.xp_reward,
          eggRewardTier: q.egg_reward_tier,
          status: q.status as 'enrolled' | 'active'
        }))

      const catalogActive = (catalogData as Array<{
        id: string
        title: string
        description: string
        target_count: number
        scaled_xp_reward: number
        egg_reward_tier: string | null
        enrollment: { id: string; status: string; progress: number } | null
      }>)
        .filter((q) => q.enrollment && (q.enrollment.status === 'enrolled' || q.enrollment.status === 'active'))
        .map((q) => ({
          id: `catalog:${q.enrollment!.id}`,
          source: 'catalog' as const,
          title: q.title,
          description: q.description,
          target: q.target_count,
          progress: q.enrollment!.progress,
          xpReward: q.scaled_xp_reward,
          eggRewardTier: q.egg_reward_tier,
          status: q.enrollment!.status as 'enrolled' | 'active'
        }))

      setActiveQuests([...dailyActive, ...catalogActive])
    } catch {
      setActiveQuests([])
    } finally {
      setActiveQuestsLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([habits.load(), journal.loadToday(), pomodoro.loadTodayStats()])
    void Promise.all([refreshDashboardStats(), refreshActiveQuests()])
  }, [])

  const handleToggleHabit = async (habitId: string, completedToday: boolean) => {
    setUpdatingHabitId(habitId)
    try {
      if (completedToday) {
        await habits.uncomplete(habitId)
      } else {
        await habits.complete(habitId)
      }
      await Promise.all([refreshDashboardStats(), refreshActiveQuests()])
    } finally {
      setUpdatingHabitId(null)
    }
  }

  const playerName = getSetting('user_name', 'Hero')
  const commitmentStatement = getSetting('commitment_statement', 'I commit to growing 1% every day.')
  const coreValuesSetting = getSetting('core_values', '[]')

  let coreValues: string[] = []
  try {
    const parsed = JSON.parse(coreValuesSetting)
    if (Array.isArray(parsed)) {
      coreValues = parsed.filter((value): value is string => typeof value === 'string')
    }
  } catch {
    coreValues = []
  }

  const visibleCoreValues = coreValues.slice(0, 3)
  const primaryValueCue = visibleCoreValues.length > 0
    ? (CORE_VALUE_META[visibleCoreValues[0]]?.cue ?? 'Small actions compound into real growth.')
    : null

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
      {/* Header greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)]">
          {new Date().getHours() < 12 ? '🌅 Good morning' : new Date().getHours() < 17 ? '☀️ Good afternoon' : '🌙 Good evening'}
          , {playerName}
        </h1>
        <p className="text-surface-400 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d')}</p>
        <p className="text-sm italic text-primary-200/90 mt-2 max-w-3xl">"{commitmentStatement}"</p>
        {visibleCoreValues.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {visibleCoreValues.map((valueId) => {
                const valueMeta = CORE_VALUE_META[valueId]
                if (!valueMeta) {
                  return null
                }

                return (
                  <span
                    key={valueId}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-primary-500/40 bg-primary-500/10 text-xs text-primary-100"
                  >
                    <span>{valueMeta.icon}</span>
                    <span>{valueMeta.label}</span>
                  </span>
                )
              })}
            </div>
            {primaryValueCue && <p className="text-xs text-surface-300">{primaryValueCue}</p>}
          </div>
        )}
      </motion.div>

      {/* Today's Stats */}
      <motion.div variants={item}>
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
                <Card className="h-full bg-gradient-to-br from-primary-900/35 to-surface-700 border-primary-700/30 hover:border-primary-500/50 transition-colors cursor-pointer">
                  <CardContent className="pt-4 pb-3 flex flex-col items-center text-center gap-2">
                    <Icon size={22} className={color} />
                    <div className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)]">{value}</div>
                    <div className="text-xs text-surface-400">{label}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
      </motion.div>

      {/* Middle Row: Habits Today + Pomodoro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Habits Quick View */}
        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-primary-900/30 to-surface-700 border-primary-700/30">
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
                    <button
                      key={habit.id}
                      type="button"
                      disabled={updatingHabitId === habit.id}
                      onClick={() => handleToggleHabit(habit.id, habit.completedToday)}
                      className={cn(
                        'w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all',
                        'hover:scale-[1.01] active:scale-[0.995] disabled:opacity-60 disabled:cursor-not-allowed',
                        habit.completedToday
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-surface-800/40 border-primary-700/30 hover:border-primary-500/40'
                      )}
                    >
                      <span className="text-xl">{habit.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium truncate', habit.completedToday ? 'text-emerald-300 line-through opacity-70' : 'text-[color:var(--app-interactive-fg-default)]')}>
                          {habit.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-surface-400">
                            {habit.streak > 0 && <><span className="streak-flame">🔥</span> {habit.streak}d streak</>}
                          </span>
                          {habit.isLegendary && <span className="text-[10px] text-amber-400 font-bold ml-1">LEGENDARY</span>}
                        </div>
                      </div>
                      <span className={cn('text-lg', habit.completedToday ? 'text-emerald-400' : 'text-surface-500')}>
                        {habit.completedToday ? '✓' : '+'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Timer or Start Prompt */}
        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-primary-900/30 to-surface-700 border-primary-700/30">
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

      {/* Bottom Row: Active Quests + Weekly Boss */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Quests */}
        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-primary-900/30 to-surface-700 border-primary-700/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={16} className="text-primary-400" />
                Active Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeQuestsLoading ? (
                <p className="text-surface-400 text-sm text-center py-4">Quests loading...</p>
              ) : activeQuests.length === 0 ? (
                <p className="text-surface-400 text-sm text-center py-4">No active quests right now.</p>
              ) : (
                <div className="space-y-3">
                  {activeQuests.map((q) => {
                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'p-3 rounded-xl border',
                          q.source === 'daily'
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-primary-500/10 border-primary-500/40'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={cn('text-sm font-medium', q.source === 'daily' ? 'text-amber-200' : 'text-primary-200')}>
                            {q.description}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide',
                              q.source === 'daily'
                                ? 'text-amber-200 border-amber-500/50 bg-amber-500/10'
                                : 'text-primary-200 border-primary-500/50 bg-primary-500/10'
                            )}>
                              {q.source}
                            </span>
                            {q.eggRewardTier && (
                              <span className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
                                'text-emerald-300 border-emerald-500/50 bg-emerald-500/10'
                              )}>
                                🥚 mystery egg
                              </span>
                            )}
                            <span className="text-xs font-bold text-amber-300">
                              +{q.xpReward} XP
                            </span>
                          </div>
                        </div>
                        <Progress value={q.progress} max={Math.max(1, q.target)} size="sm" />
                        <div className="text-[10px] text-surface-400 mt-1">{q.progress}/{q.target} • {q.status}</div>
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
                    <div className="font-bold text-[color:var(--app-interactive-fg-default)]">{weeklyBoss.name}</div>
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
                    <Progress value={weeklyBoss.current_hp} max={weeklyBoss.max_hp} variant="hp" size="md" />
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
