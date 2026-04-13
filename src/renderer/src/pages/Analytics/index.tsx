import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Badge } from '../../components/ui/badge'
import { useGamificationStore } from '../../stores/gamification.store'
import { levelFromXP, xpForLevel } from '../../lib/science/xp'
import { TIER_COLORS } from '../../lib/science/rewards'
import { cn } from '../../lib/utils'
import { format, parseISO } from 'date-fns'

const api = () => window.api

const CLASS_ICONS: Record<string, string> = {
  'Time Mage': '⚡', 'Iron Warrior': '⚔️', 'Zen Master': '🌿',
  'Arcane Scholar': '🧙', 'Grand Tactician': '🎯', 'Apprentice': '🌱'
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common']

export function AnalyticsPage() {
  const gami = useGamificationStore()
  const [badges, setBadges] = useState<Array<{ code: string; name: string; description: string; icon: string; rarity: string; xp_value: number; unlocked_at: number | null }>>([])
  const [heatmap, setHeatmap] = useState<Array<{ date: string; count: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api().analytics.badges(),
      api().analytics.heatmap(new Date().getFullYear())
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

  const xpProgress = levelFromXP(gami.totalXP)
  const xpCurrent = xpForLevel(xpProgress)
  const xpNext = xpForLevel(xpProgress + 1)
  const progressPct = Math.min(100, ((gami.totalXP - xpCurrent) / (xpNext - xpCurrent)) * 100)

  const unlockedCount = badges.filter((b) => b.unlocked_at).length
  const totalBadges = badges.length

  // Heatmap rendering — 53 weeks
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Progress & Analytics</h1>
        <p className="text-surface-400 text-sm mt-1">Your journey at a glance.</p>
      </div>

      {/* Character + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Character Card */}
        <Card className="bg-gradient-to-br from-primary-900/30 to-surface-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-600/30 border-2 border-primary-500/40 flex items-center justify-center text-3xl">
                {CLASS_ICONS[gami.characterClass]}
              </div>
              <div>
                <div className="text-xl font-bold text-white">{gami.characterClass}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-amber-400 font-bold">Level {gami.level}</span>
                  <span className="text-surface-400 text-xs">· {gami.totalXP.toLocaleString()} total XP</span>
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
          </CardContent>
        </Card>

        {/* RPG Stats Radar */}
        <Card>
          <CardHeader><CardTitle>Character Stats</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2d2d4a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8888aa', fontSize: 11 }} />
                <Radar dataKey="value" fill="#7c3aed" fillOpacity={0.3} stroke="#8b5cf6" strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
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

      {/* Trophy Room */}
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
                // Sort: unlocked first, then by rarity
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
