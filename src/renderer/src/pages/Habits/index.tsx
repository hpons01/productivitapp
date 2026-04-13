import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Flame, Trophy } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Modal } from '../../components/ui/modal'
import { Input, Textarea } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { useHabitsStore, Habit } from '../../stores/habits.store'
import { useGamificationStore } from '../../stores/gamification.store'
import { cn } from '../../lib/utils'
import { isLegendaryGrind } from '../../lib/science/xp'

const ICONS = ['✨', '🏋️', '📚', '💧', '🧘', '🚶', '🍎', '😴', '📝', '🎯', '🧠', '💊', '🌿', '⚡', '🎸', '🏃']
const COLORS = ['#7c3aed', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']

function HabitForm({
  onSave,
  initial
}: {
  onSave: (data: Partial<Habit>) => void
  initial?: Partial<Habit>
}) {
  const [name, setName] = useState(initial?.name || '')
  const [cue, setCue] = useState(initial?.cue || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [icon, setIcon] = useState(initial?.icon || '✨')
  const [color, setColor] = useState(initial?.color || '#7c3aed')
  const [category, setCategory] = useState(initial?.category || 'general')

  return (
    <div className="space-y-4">
      <Input label="Habit Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Morning meditation" />

      <div>
        <label className="text-xs font-medium text-surface-300 block mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-1.5">
          {ICONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={cn(
                'w-9 h-9 rounded-lg text-lg transition-all',
                icon === i ? 'bg-primary-600/30 ring-2 ring-primary-500' : 'bg-surface-800 hover:bg-surface-700'
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-300 block mb-1.5">Color</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn('w-7 h-7 rounded-full transition-all', color === c && 'ring-2 ring-offset-2 ring-offset-surface-700 ring-white')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-300 block mb-1.5">
          Habit Stack Cue <span className="text-surface-500">(optional)</span>
        </label>
        <Input
          value={cue}
          onChange={(e) => setCue(e.target.value)}
          placeholder="After I brush my teeth..."
        />
        {cue && (
          <p className="text-xs text-primary-400 mt-1">
            → After I {cue}, I will <strong>{name || '...'}</strong>
          </p>
        )}
      </div>

      <Select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {['general', 'health', 'fitness', 'learning', 'mindfulness', 'productivity', 'social'].map((c) => (
          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
        ))}
      </Select>

      <Textarea
        label="Notes (optional)"
        value={description || ''}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Why is this habit important to you?"
        rows={2}
      />

      <Button
        onClick={() => onSave({ name, cue, description, icon, color, category })}
        disabled={!name.trim()}
        className="w-full"
      >
        Save Habit
      </Button>
    </div>
  )
}

export function HabitsPage() {
  const { habits, loading, load, create, update, remove, complete, uncomplete } = useHabitsStore()
  const { pendingRewards } = useGamificationStore()
  const [showForm, setShowForm] = useState(false)
  const [xpPopups, setXpPopups] = useState<Array<{ id: string; amount: number; x: number; y: number }>>([])

  useEffect(() => { load() }, [])

  const handleComplete = async (habitId: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const result = await complete(habitId)
    if (result.xpAwarded > 0) {
      const popId = `popup_${Date.now()}`
      setXpPopups((p) => [...p, { id: popId, amount: result.xpAwarded, x: rect.left + rect.width / 2, y: rect.top }])
      setTimeout(() => setXpPopups((p) => p.filter((x) => x.id !== popId)), 1500)
    }
  }

  const completedCount = habits.filter((h) => h.completedToday).length
  const totalCount = habits.length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Habits</h1>
          <p className="text-surface-400 text-sm mt-1">
            {completedCount}/{totalCount} completed today
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Habit
        </Button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-surface-400">
            <span>Today's Progress</span>
            <span>{Math.round((completedCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Habit List */}
      {loading ? (
        <div className="text-center py-12 text-surface-400">Loading habits...</div>
      ) : habits.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-3">🌱</div>
            <p className="text-white font-semibold mb-1">Start Your Habit Journey</p>
            <p className="text-surface-400 text-sm mb-4">Build powerful habits, one day at a time.</p>
            <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Your First Habit</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {habits.map((habit) => (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
              >
                <Card
                  className={cn(
                    'transition-all duration-300',
                    habit.completedToday
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : habit.isLegendary
                        ? 'border-amber-500/30 bg-amber-500/5 animate-pulse-glow'
                        : 'hover:border-surface-400/40'
                  )}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Completion toggle */}
                    <button
                      onClick={(e) => habit.completedToday ? uncomplete(habit.id) : handleComplete(habit.id, e)}
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 transition-all',
                        'hover:scale-105 active:scale-95 shrink-0',
                        habit.completedToday
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-surface-800 border-surface-500 hover:border-primary-500'
                      )}
                      style={!habit.completedToday ? { borderColor: habit.color + '60' } : {}}
                    >
                      {habit.completedToday ? '✓' : habit.icon}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-semibold text-sm truncate', habit.completedToday ? 'text-surface-400 line-through' : 'text-white')}>
                          {habit.name}
                        </span>
                        {habit.isLegendary && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-bold">
                            LEGENDARY
                          </span>
                        )}
                      </div>
                      {habit.cue && (
                        <p className="text-xs text-surface-400 mt-0.5 truncate">After I {habit.cue}</p>
                      )}
                    </div>

                    {/* Streak */}
                    <div className="flex flex-col items-center shrink-0">
                      {habit.streak > 0 ? (
                        <>
                          <span className={cn('text-xl', habit.isLegendary ? 'streak-flame' : '')}>🔥</span>
                          <span className={cn('text-xs font-bold', habit.isLegendary ? 'text-amber-400' : 'text-surface-300')}>
                            {habit.streak}d
                          </span>
                        </>
                      ) : (
                        <Flame size={20} className="text-surface-600" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* XP Popups */}
      {xpPopups.map((p) => (
        <motion.div
          key={p.id}
          className="fixed z-50 pointer-events-none font-bold text-amber-400 text-sm"
          style={{ left: p.x, top: p.y }}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -50 }}
          transition={{ duration: 1.5 }}
        >
          +{p.amount} XP
        </motion.div>
      ))}

      {/* New Habit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Habit">
        <HabitForm
          onSave={async (data) => {
            await create({
              name: data.name!,
              description: data.description || null,
              cue: data.cue || null,
              category: data.category || 'general',
              frequency: 'daily',
              color: data.color || '#7c3aed',
              icon: data.icon || '✨'
            })
            setShowForm(false)
          }}
        />
      </Modal>
    </div>
  )
}
