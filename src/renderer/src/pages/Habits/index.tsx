import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Flame, MoreVertical, Pencil, Trash2, Brain } from 'lucide-react'
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
  initial,
  submitLabel = 'Save Habit'
}: {
  onSave: (data: Partial<Habit>) => void
  initial?: Partial<Habit>
  submitLabel?: string
}) {
  const [name, setName] = useState(initial?.name || '')
  const [cue, setCue] = useState(initial?.cue || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [obstaclePlan, setObstaclePlan] = useState(initial?.obstacle_plan || '')
  const [tinyMode, setTinyMode] = useState(initial?.tiny_mode === 1)
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

      <Input
        label="If I feel like skipping, I will..."
        value={obstaclePlan || ''}
        onChange={(e) => setObstaclePlan(e.target.value)}
        placeholder="Do a 2-minute version and restart momentum"
      />

      <div className="rounded-xl border border-surface-600 bg-surface-800/60 p-3">
        <label className="flex items-start gap-2 text-sm text-surface-200">
          <input
            type="checkbox"
            checked={tinyMode}
            onChange={(e) => setTinyMode(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold text-white">Start as Tiny Habit mode</span>
            <span className="block text-xs text-surface-400 mt-0.5">2-minute minimum version, then graduate after one week of consistency.</span>
          </span>
        </label>
      </div>

      <Button
        onClick={() => onSave({
          name,
          cue,
          description,
          obstacle_plan: obstaclePlan || null,
          tiny_mode: tinyMode ? 1 : 0,
          tiny_started_at: tinyMode ? (initial?.tiny_started_at ?? Date.now()) : null,
          icon,
          color,
          category
        })}
        disabled={!name.trim()}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </div>
  )
}

function HabitMenu({ habit, onEdit, onDelete }: { habit: Habit; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-700 transition-all"
        aria-label="Habit actions"
      >
        <MoreVertical size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-9 z-20 min-w-[120px] bg-surface-800 border border-surface-600 rounded-xl shadow-xl overflow-hidden"
          >
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-surface-200 hover:bg-surface-700 hover:text-white transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeleteConfirmModal({ habit, onConfirm, onCancel }: { habit: Habit; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open onClose={onCancel} title="Delete Habit">
      <div className="space-y-4">
        <p className="text-surface-300 text-sm">
          Are you sure you want to delete <span className="text-white font-semibold">{habit.icon} {habit.name}</span>?
        </p>
        <p className="text-surface-500 text-xs">
          This will remove the habit and its completion history. Your streak of <strong className="text-amber-400">{habit.streak} days</strong> will be lost.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={onConfirm} className="flex-1">
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const LAPSE_REASON_OPTIONS = [
  { code: 'environment', label: 'Environment', hint: 'My setup or schedule made it hard.' },
  { code: 'motivation', label: 'Motivation', hint: 'I felt low drive or emotionally drained.' },
  { code: 'skill', label: 'Skill', hint: 'The habit felt too hard or unclear.' },
  { code: 'memory', label: 'Memory', hint: 'I forgot or lost track during the day.' }
] as const

function LapseReflectionModal({
  onSubmit,
  onDismiss,
  suggestedAction,
  existingNote
}: {
  onSubmit: (reasonCode: string, note: string) => Promise<void>
  onDismiss: () => void
  suggestedAction: string | null
  existingNote: string | null
}) {
  const [reasonCode, setReasonCode] = useState<string>('environment')
  const [note, setNote] = useState(existingNote ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <Modal open onClose={onDismiss} title="Streak Reflection">
      <div className="space-y-4">
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          <p className="text-sm text-amber-100 font-medium">A streak break was detected today.</p>
          <p className="text-xs text-amber-200/80 mt-1">Quick reflection helps you restart faster and avoid repeat misses.</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-300 uppercase tracking-wide">What most likely caused the lapse?</p>
          <div className="grid grid-cols-1 gap-2">
            {LAPSE_REASON_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setReasonCode(option.code)}
                className={cn(
                  'text-left rounded-xl border p-3 transition-colors',
                  reasonCode === option.code
                    ? 'border-primary-500/60 bg-primary-500/15 text-white'
                    : 'border-surface-600 bg-surface-800 text-surface-200 hover:border-surface-400'
                )}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-surface-400 mt-0.5">{option.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Optional note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="One line about what happened today..."
          rows={3}
        />

        {suggestedAction && (
          <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-200">
            Suggested reset action: {suggestedAction}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onDismiss}>Skip for now</Button>
          <Button
            className="flex-1"
            loading={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSubmit(reasonCode, note)
              } finally {
                setSaving(false)
              }
            }}
          >
            <Brain size={14} /> Save Reflection
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function MicroCheckinModal({
  habit,
  onSubmit,
  onSkip
}: {
  habit: Habit
  onSubmit: (difficulty: number, focusEffort: number) => Promise<void>
  onSkip: () => void
}) {
  const [difficulty, setDifficulty] = useState('3')
  const [focusEffort, setFocusEffort] = useState('3')
  const [saving, setSaving] = useState(false)

  return (
    <Modal open onClose={onSkip} title="Quick Check-in">
      <div className="space-y-4">
        <p className="text-sm text-surface-200">
          How did <span className="text-white font-semibold">{habit.name}</span> feel?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="1">1 - Very easy</option>
            <option value="2">2 - Easy</option>
            <option value="3">3 - Moderate</option>
            <option value="4">4 - Hard</option>
            <option value="5">5 - Very hard</option>
          </Select>
          <Select label="Focus effort" value={focusEffort} onChange={(e) => setFocusEffort(e.target.value)}>
            <option value="1">1 - Low</option>
            <option value="2">2 - Light</option>
            <option value="3">3 - Good</option>
            <option value="4">4 - High</option>
            <option value="5">5 - Intense</option>
          </Select>
        </div>
        <p className="text-xs text-surface-400">We use this to tune challenge and avoid burnout.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onSkip}>Skip</Button>
          <Button
            className="flex-1"
            loading={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSubmit(Number(difficulty), Number(focusEffort))
              } finally {
                setSaving(false)
              }
            }}
          >
            Save Check-in
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function HabitsPage() {
  const {
    habits,
    loading,
    load,
    create,
    update,
    remove,
    complete,
    uncomplete,
    lapsePrompt,
    submitLapseReflection,
    dismissLapsePrompt,
    graduateTinyHabit,
    submitMicroCheckin
  } = useHabitsStore()
  const { pendingRewards } = useGamificationStore()
  const [showForm, setShowForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null)
  const [xpPopups, setXpPopups] = useState<Array<{ id: string; amount: number; x: number; y: number }>>([])
  const [graduatingHabit, setGraduatingHabit] = useState<Habit | null>(null)
  const [microCheckinHabit, setMicroCheckinHabit] = useState<Habit | null>(null)

  useEffect(() => { load() }, [])

  const handleComplete = async (habitId: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const result = await complete(habitId)
    if (result.xpAwarded > 0) {
      const popId = `popup_${Date.now()}`
      setXpPopups((p) => [...p, { id: popId, amount: result.xpAwarded, x: rect.left + rect.width / 2, y: rect.top }])
      setTimeout(() => setXpPopups((p) => p.filter((x) => x.id !== popId)), 1500)
    }

    if (result.shouldSuggestGraduation) {
      const habit = habits.find((h) => h.id === habitId)
      if (habit) setGraduatingHabit(habit)
    }

    const habit = habits.find((h) => h.id === habitId)
    if (habit) {
      setMicroCheckinHabit(habit)
    }
  }

  const handleEdit = async (data: Partial<Habit>) => {
    if (!editingHabit) return
    await update(editingHabit.id, data)
    setEditingHabit(null)
  }

  const handleDelete = async () => {
    if (!deletingHabit) return
    await remove(deletingHabit.id)
    setDeletingHabit(null)
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
                        {habit.tiny_mode === 1 && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded-md font-bold">
                            TINY MODE
                          </span>
                        )}
                      </div>
                      {habit.cue && (
                        <p className="text-xs text-surface-400 mt-0.5 truncate">After I {habit.cue}</p>
                      )}
                      {habit.obstacle_plan && (
                        <p className="text-[11px] text-amber-300/90 mt-0.5 truncate">
                          If resistance shows up: {habit.obstacle_plan}
                        </p>
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

                    {/* Actions menu */}
                    <HabitMenu
                      habit={habit}
                      onEdit={() => setEditingHabit(habit)}
                      onDelete={() => setDeletingHabit(habit)}
                    />
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

      {/* Edit Habit Modal */}
      {editingHabit && (
        <Modal open onClose={() => setEditingHabit(null)} title={`Edit — ${editingHabit.name}`}>
          <HabitForm
            initial={editingHabit}
            submitLabel="Save Changes"
            onSave={handleEdit}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deletingHabit && (
        <DeleteConfirmModal
          habit={deletingHabit}
          onConfirm={handleDelete}
          onCancel={() => setDeletingHabit(null)}
        />
      )}

      {lapsePrompt?.brokenStreak && !lapsePrompt.alreadyReflected && (
        <LapseReflectionModal
          onDismiss={dismissLapsePrompt}
          existingNote={lapsePrompt.latestReflection?.note ?? null}
          suggestedAction={lapsePrompt.latestReflection?.suggested_action ?? null}
          onSubmit={async (reasonCode, note) => {
            await submitLapseReflection(reasonCode, note)
          }}
        />
      )}

      {graduatingHabit && (
        <Modal open onClose={() => setGraduatingHabit(null)} title="Tiny Habit Graduation">
          <div className="space-y-4">
            <p className="text-sm text-surface-200">
              You kept <span className="font-semibold text-white">{graduatingHabit.name}</span> consistent for a week.
            </p>
            <p className="text-xs text-surface-400">
              Ready to graduate from tiny mode and raise your standard?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setGraduatingHabit(null)}>
                Keep Tiny Mode
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  await graduateTinyHabit(graduatingHabit.id)
                  setGraduatingHabit(null)
                }}
              >
                Graduate
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {microCheckinHabit && (
        <MicroCheckinModal
          habit={microCheckinHabit}
          onSkip={() => setMicroCheckinHabit(null)}
          onSubmit={async (difficulty, focusEffort) => {
            await submitMicroCheckin(microCheckinHabit.id, difficulty, focusEffort)
            setMicroCheckinHabit(null)
          }}
        />
      )}
    </div>
  )
}
