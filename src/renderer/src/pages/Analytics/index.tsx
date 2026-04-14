import { useEffect, useMemo, useState } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { useGamificationStore } from '../../stores/gamification.store'
import { levelFromXP, xpForLevel } from '../../lib/science/xp'
import { TIER_COLORS } from '../../lib/science/rewards'
import { SOURCE_LABELS } from '../../lib/constants/classes'
import { cn } from '../../lib/utils'
import { format, parseISO } from 'date-fns'

const api = () => window.api

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common']

type ClassProgress = {
  classId: string
  masteryXp: number
  currentEvolutionTitle: string
  currentEvolutionIndex: number
  nextEvolutionTitle: string | null
  nextEvolutionXp: number | null
  progressPct: number
}

type RecentBonus = {
  source: string
  amount: number
  baseAmount: number
  bonusAmount: number
  multiplier: number
  classIdApplied: string
  loggedAt: number
}

export function AnalyticsPage() {
  const gami = useGamificationStore()
  const [badges, setBadges] = useState<Array<{ code: string; name: string; description: string; icon: string; rarity: string; xp_value: number; unlocked_at: number | null }>>([])
  const [heatmap, setHeatmap] = useState<Array<{ date: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [switchingClass, setSwitchingClass] = useState<string | null>(null)
  const [classProgress, setClassProgress] = useState<Record<string, ClassProgress>>({})
  const [recentBonus, setRecentBonus] = useState<RecentBonus[]>([])

  async function loadClassProgress() {
    const payload = await api().analytics.classProgress()
    const map: Record<string, ClassProgress> = {}
    for (const item of payload.classes || []) {
      map[item.classId] = item
    }
    setClassProgress(map)
    setRecentBonus(payload.recentBonusGains || [])
  }

  useEffect(() => {
    Promise.all([
      api().analytics.badges(),
      api().analytics.heatmap(new Date().getFullYear()),
      gami.loadCharacterClassConfig(),
      loadClassProgress()
    ]).then(([b, h]) => {
      setBadges(b || [])
      setHeatmap(h || [])
      setLoading(false)
    })
  }, [])

  const radarData = [
    { subject: 'Focus', value: gami.focusPower },
    { subject: 'Discipline', value: gami.discipline },
    { subject: 'Vitality', value: gami.vitality },
    { subject: 'Wisdom', value: gami.wisdom }
  ]

  const statCards = [
    { key: 'focus', label: 'Focus', value: gami.focusPower, tone: 'text-sky-300', detail: 'Pomodoro momentum and deep work strength.' },
    { key: 'discipline', label: 'Discipline', value: gami.discipline, tone: 'text-rose-300', detail: 'Task execution and follow-through consistency.' },
    { key: 'vitality', label: 'Vitality', value: gami.vitality, tone: 'text-emerald-300', detail: 'Habit rhythm and sustainable routine health.' },
    { key: 'wisdom', label: 'Wisdom', value: gami.wisdom, tone: 'text-amber-300', detail: 'Reflection quality and self-awareness growth.' }
  ]

  const xpProgress = levelFromXP(gami.totalXP)
  const xpCurrent = xpForLevel(xpProgress)
  const xpNext = xpForLevel(xpProgress + 1)
  const progressPct = Math.min(100, ((gami.totalXP - xpCurrent) / (xpNext - xpCurrent)) * 100)

  const unlockedCount = badges.filter((b) => b.unlocked_at).length
  const totalBadges = badges.length

  const classBonusLabel = gami.classBonusSource ? SOURCE_LABELS[gami.classBonusSource] || gami.classBonusSource : 'No active class bonus'
  const classEvolutionRemaining = gami.classEvolutionNextXp
    ? Math.max(0, gami.classEvolutionNextXp - gami.classMasteryXp)
    : 0
  const classMultiplierText = useMemo(() => {
    if (!gami.classBonusSource || gami.classBonusMultiplier <= 1) return 'x1.00'
    return `x${gami.classBonusMultiplier.toFixed(2)}`
  }, [gami.classBonusSource, gami.classBonusMultiplier])
  const selectedClass = gami.classOptions.find((c) => c.id === gami.selectedClassId)
  const selectedClassProgress = selectedClass ? classProgress[selectedClass.id] : undefined

  const weeks: Array<typeof heatmap> = []
  if (heatmap.length > 0) {
    for (let i = 0; i < heatmap.length; i += 7) {
      weeks.push(heatmap.slice(i, i + 7))
    }
  }

  const maxCount = Math.max(...heatmap.map((d) => d.count), 1)

  function heatColor(count: number): string {
    if (count === 0) return '#1e1e35'
    const intensity = count / maxCount
    if (intensity < 0.25) return '#312e81'
    if (intensity < 0.5) return '#4c1d95'
    if (intensity < 0.75) return '#6d28d9'
    return '#7c3aed'
  }

  async function onSelectClass(classId: string) {
    if (classId === gami.selectedClassId || switchingClass) return
    setSwitchingClass(classId)
    try {
      await gami.setCharacterClass(classId)
      await loadClassProgress()
    } finally {
      setSwitchingClass(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Progress Command Center</h1>
        <p className="text-surface-400 text-sm mt-1">Track your build, tune your class, and level with intention.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-gradient-to-br from-primary-900/30 to-surface-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-600/30 border-2 border-primary-500/40 flex items-center justify-center text-3xl">
                {gami.classOptions.find((c) => c.id === gami.selectedClassId)?.icon || '🌱'}
              </div>
              <div>
                <div className="text-xl font-bold text-white">{gami.characterClass}</div>
                <div className="text-xs text-surface-400 mt-0.5">{gami.selectedClassDescription}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-amber-400 font-bold">Level {gami.level}</span>
                  <span className="text-surface-400 text-xs">· {gami.totalXP.toLocaleString()} total XP</span>
                  <span className="text-surface-500 text-xs">· Playstyle: {gami.playstyleClass}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-surface-400">Progress to Level {gami.level + 1}</span>
                <span className="text-amber-400 font-bold">{Math.max(0, xpNext - gami.totalXP)} XP remaining</span>
              </div>
              <Progress value={progressPct} variant="xp" size="md" />
            </div>

            <div className="mt-4 rounded-xl border border-primary-500/20 bg-primary-500/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-primary-200 uppercase tracking-wide">Class Evolution</span>
                <span className="text-primary-100 font-semibold">{gami.classEvolutionTitle}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-surface-300">Mastery XP: {gami.classMasteryXp.toLocaleString()}</span>
                <span className="text-surface-400">
                  {gami.classEvolutionNextTitle
                    ? `${classEvolutionRemaining} XP to ${gami.classEvolutionNextTitle}`
                    : 'Final evolution reached'}
                </span>
              </div>
              <Progress value={gami.classEvolutionProgressPct} size="sm" className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Bonus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-200 uppercase tracking-wide">Boosted Activity</div>
              <div className="text-white font-semibold mt-1">{classBonusLabel}</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <div className="text-xs text-amber-200 uppercase tracking-wide">XP Multiplier</div>
              <div className="text-2xl font-bold text-amber-300 mt-1">{classMultiplierText}</div>
            </div>
            <p className="text-xs text-surface-400">Only activity XP is boosted (Pomodoro, Tasks, Habits, Journal, Energy).</p>

            <div className="pt-1">
              <div className="text-[11px] uppercase tracking-wide text-surface-400 mb-1.5">Recent Bonus XP</div>
              {recentBonus.length === 0 ? (
                <div className="text-xs text-surface-500">No bonus XP yet. Equip a class and complete its boosted activity.</div>
              ) : (
                <div className="space-y-1.5 max-h-28 overflow-auto pr-1">
                  {recentBonus.map((gain, index) => (
                    <div key={`${gain.loggedAt}_${index}`} className="flex items-center justify-between text-xs rounded-lg bg-surface-800/60 px-2 py-1">
                      <span className="text-surface-300">{SOURCE_LABELS[gain.source] || gain.source}</span>
                      <span className="text-emerald-300 font-semibold">+{gain.bonusAmount} bonus</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Character Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statCards.map((stat) => (
              <div key={stat.key} className="rounded-xl border border-surface-600/40 bg-surface-800/40 p-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-surface-300">{stat.label}</span>
                  <span className={cn('font-bold', stat.tone)}>{stat.value}</span>
                </div>
                <Progress value={stat.value} size="sm" />
                <p className="text-[11px] text-surface-500 mt-1.5">{stat.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stat Shape</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2d2d4a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8888aa', fontSize: 11 }} />
                <Radar dataKey="value" fill="#7c3aed" fillOpacity={0.3} stroke="#8b5cf6" strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose Your Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gami.classOptions.map((classDef) => {
              const selected = classDef.id === gami.selectedClassId
              const boostedLabel = classDef.boostedSource ? SOURCE_LABELS[classDef.boostedSource] || classDef.boostedSource : 'No bonus'
              const progress = classProgress[classDef.id]
              const pathPreview = classDef.evolutionPath.map((step) => step.title).join(' -> ')

              return (
                <button
                  key={classDef.id}
                  onClick={() => void onSelectClass(classDef.id)}
                  className={cn(
                    'text-left rounded-2xl border p-4 transition-all',
                    selected
                      ? 'border-primary-500 bg-primary-500/15 shadow-[0_0_0_1px_rgba(124,58,237,0.4)]'
                      : 'border-surface-600/40 bg-surface-800/40 hover:border-surface-400/60'
                  )}
                  disabled={Boolean(switchingClass)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-2xl">{classDef.icon}</div>
                    {selected && <span className="text-[10px] uppercase tracking-wider text-primary-300 font-bold">Equipped</span>}
                  </div>
                  <div className="text-white font-semibold mt-2">{classDef.name}</div>
                  <div className="text-xs text-surface-400 mt-1 min-h-[34px]">{classDef.description}</div>
                  <div className="mt-3 text-xs text-surface-300">Boost: {boostedLabel}</div>
                  <div className="text-xs text-amber-300 font-semibold">Multiplier: x{classDef.multiplier.toFixed(2)}</div>
                  <div className="mt-2 text-[11px] text-primary-200 font-semibold">
                    Evolution: {progress?.currentEvolutionTitle || classDef.evolutionPath[0]?.title}
                  </div>
                  <div className="text-[10px] text-surface-500 mt-0.5 truncate">{pathPreview}</div>
                  <Progress value={progress?.progressPct || 0} size="sm" className="mt-1.5" />
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolution Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
            <div className="text-sm text-surface-400">Select a class to view its evolution path.</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-surface-300">
                <span className="font-semibold text-white">{selectedClass.name}</span>
                <span className="text-surface-500"> · Mastery XP {selectedClassProgress?.masteryXp?.toLocaleString() || 0}</span>
              </div>

              <div className="space-y-2">
                {selectedClass.evolutionPath.map((step, idx) => {
                  const unlocked = (selectedClassProgress?.masteryXp || 0) >= step.minXp
                  const isCurrent = selectedClassProgress?.currentEvolutionIndex === idx
                  const isFinal = idx === selectedClass.evolutionPath.length - 1
                  const nextThreshold = selectedClass.evolutionPath[idx + 1]?.minXp || null
                  const progress = isFinal
                    ? unlocked
                      ? 100
                      : 0
                    : Math.max(
                        0,
                        Math.min(
                          100,
                          Math.round((((selectedClassProgress?.masteryXp || 0) - step.minXp) / Math.max(1, (nextThreshold || step.minXp) - step.minXp)) * 100)
                        )
                      )

                  return (
                    <div
                      key={`${selectedClass.id}_${step.title}`}
                      className={cn(
                        'rounded-xl border px-3 py-2.5',
                        unlocked ? 'border-primary-500/40 bg-primary-500/10' : 'border-surface-600/40 bg-surface-800/40',
                        isCurrent && 'ring-1 ring-primary-400/50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{step.title}</div>
                          <div className="text-[11px] text-surface-400">Unlocks at {step.minXp} mastery XP</div>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] uppercase tracking-wide font-bold',
                            isCurrent ? 'text-primary-300' : unlocked ? 'text-emerald-300' : 'text-surface-500'
                          )}
                        >
                          {isCurrent ? 'Current' : unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>

                      <p className="text-xs text-surface-300 mt-1.5">{step.perk}</p>
                      {!isFinal && <Progress value={progress} size="sm" className="mt-2" />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Habit Heatmap — {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-surface-400 text-sm">Loading heatmap...</div>
          ) : (
            <TooltipPrimitive.Provider delayDuration={200}>
              <div className="overflow-x-auto">
                <div className="flex gap-1">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1">
                      {week.map((day) => (
                        <TooltipPrimitive.Root key={day.date}>
                          <TooltipPrimitive.Trigger asChild>
                            <div
                              className="w-3 h-3 rounded-sm transition-colors cursor-default"
                              style={{ backgroundColor: heatColor(day.count) }}
                            />
                          </TooltipPrimitive.Trigger>
                          <TooltipPrimitive.Portal>
                            <TooltipPrimitive.Content
                              side="top"
                              sideOffset={4}
                              className="z-50 rounded-lg bg-surface-700 border border-surface-500 px-2.5 py-1.5 text-xs text-white shadow-xl select-none animate-in fade-in-0 zoom-in-95"
                            >
                              <span className="font-semibold">{format(parseISO(day.date), 'MMM d, yyyy')}</span>
                              <span className="text-surface-300 ml-1.5">
                                {day.count === 0 ? 'No habits' : `${day.count} habit${day.count !== 1 ? 's' : ''}`}
                              </span>
                              <TooltipPrimitive.Arrow className="fill-surface-700" />
                            </TooltipPrimitive.Content>
                          </TooltipPrimitive.Portal>
                        </TooltipPrimitive.Root>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </TooltipPrimitive.Provider>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trophy Room</CardTitle>
            <span className="text-xs text-amber-400 font-bold">{unlockedCount}/{totalBadges} unlocked</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {badges
              .sort((a, b) => {
                if (a.unlocked_at && !b.unlocked_at) return -1
                if (!a.unlocked_at && b.unlocked_at) return 1
                return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
              })
              .map((badge) => {
                const colors = TIER_COLORS[badge.rarity as keyof typeof TIER_COLORS] || TIER_COLORS.common
                const isUnlocked = !!badge.unlocked_at
                const isSecret = badge.name === '???'

                return (
                  <div
                    key={badge.code}
                    className={cn(
                      'p-3 rounded-xl border text-center transition-all',
                      isUnlocked ? [colors.bg, `border-${badge.rarity === 'legendary' ? 'amber' : badge.rarity === 'epic' ? 'purple' : badge.rarity === 'rare' ? 'blue' : badge.rarity === 'uncommon' ? 'emerald' : 'gray'}-500/30`] : 'bg-surface-800/40 border-surface-600/20 opacity-40 grayscale'
                    )}
                  >
                    <div className="text-2xl mb-1">{isSecret && !isUnlocked ? '❓' : badge.icon}</div>
                    <div className={cn('text-xs font-semibold', isUnlocked ? colors.text : 'text-surface-500')}>
                      {isSecret && !isUnlocked ? '???' : badge.name}
                    </div>
                    {isUnlocked && (
                      <div className="text-[10px] text-surface-500 mt-0.5">
                        +{badge.xp_value} XP
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
