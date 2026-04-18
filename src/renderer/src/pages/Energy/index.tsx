import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useEnergyStore } from '../../stores/energy.store'
import { getEnergyZone } from '../../lib/science/energy-zones'
import { format } from 'date-fns'
import { cn } from '../../lib/utils'
import { ENERGY_OPTIONS } from '../../lib/constants/energy-emojis'

export function EnergyPage() {
  const { logs, latest, loading, loadRange, logEnergy } = useEnergyStore()
  const [selectedEnergy, setSelectedEnergy] = useState(3)
  const [selectedMood, setSelectedMood] = useState(3)
  const [logged, setLogged] = useState(false)

  useEffect(() => { loadRange(14) }, [])

  const currentZone = latest ? getEnergyZone(latest.energy) : null

  const chartData = logs.slice(-24).map((l) => ({
    time: format(new Date(l.logged_at), 'HH:mm'),
    energy: l.energy,
    mood: l.mood
  }))

  const handleLog = async () => {
    await logEnergy(selectedEnergy, selectedMood)
    setLogged(true)
    setTimeout(() => setLogged(false), 3000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-interactive-fg-default)]">Energy Tracker</h1>
        <p className="text-surface-400 text-sm mt-1">Track your energy to discover your peak performance windows.</p>
      </div>

      {/* Current state */}
      {currentZone && (
        <Card className="bg-gradient-to-br from-primary-900/20 to-surface-700">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{currentZone.emoji}</div>
              <div>
                <div className="font-bold text-[color:var(--app-interactive-fg-default)]">{currentZone.label} Energy</div>
                <div className="text-surface-400 text-xs mt-0.5 max-w-xs">{currentZone.recommendation}</div>
              </div>
              <div className="ml-auto text-xs text-surface-500">
                Last logged: {format(new Date(latest!.logged_at), 'HH:mm')}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[10px] text-surface-400 mb-1.5 uppercase tracking-wide">Best for right now</div>
              <div className="flex flex-wrap gap-1.5">
                {currentZone.bestFor.map((a) => (
                  <span key={a} className="text-xs bg-primary-600/20 text-primary-300 border border-primary-500/20 rounded-lg px-2 py-0.5">{a}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log check-in */}
      <Card>
        <CardHeader><CardTitle>How's Your Energy Right Now?</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-surface-400 mb-3 font-medium uppercase tracking-wide">Energy Level</p>
            <div className="flex gap-3 justify-center">
              {ENERGY_OPTIONS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedEnergy(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl transition-all cursor-pointer',
                    selectedEnergy === value
                      ? 'bg-primary-600/30 ring-2 ring-primary-500 scale-105'
                      : 'bg-surface-800 ui-bg-hover'
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[10px] text-surface-300">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-surface-400 mb-3 font-medium uppercase tracking-wide">Mood</p>
            <div className="flex gap-3 justify-center">
              {[['😤', 1], ['😕', 2], ['😐', 3], ['😊', 4], ['🤩', 5]].map(([emoji, val]) => (
                <button
                  key={val}
                  onClick={() => setSelectedMood(val as number)}
                  className={cn(
                    'text-2xl p-2 rounded-xl transition-all cursor-pointer',
                    selectedMood === val ? 'bg-primary-600/30 ring-2 ring-primary-500 scale-110' : 'ui-bg-hover'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleLog}
          >
            {logged ? '✅ Logged! +5 XP' : 'Log Energy'}
          </Button>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Energy Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fill: '#8888aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 5]} tick={{ fill: '#8888aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#16162a', border: '1px solid #2d2d4a', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a0a0c0' }}
                />
                <Line type="monotone" dataKey="energy" stroke="#7c3aed" strokeWidth={2} dot={false} name="Energy" />
                <Line type="monotone" dataKey="mood" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Mood" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
