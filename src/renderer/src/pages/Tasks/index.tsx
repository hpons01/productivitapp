import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, CheckCircle, Clock, Pencil, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Textarea } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Badge } from '../../components/ui/badge'
import { useTasksStore, Task } from '../../stores/tasks.store'

const PRIORITY_LABELS = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLORS: Record<number, string> = {
  1: 'danger', 2: 'warning', 3: 'default'
}

function toDateTimeLocalInput(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDateTimeLocalInput(value: string): number | null {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function formatPlannedFor(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}

function TaskForm({
  onSave,
  initial,
  submitLabel = 'Add Task'
}: {
  onSave: (data: Partial<Task>) => void
  initial?: Partial<Task>
  submitLabel?: string
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [priority, setPriority] = useState(initial?.priority || 2)
  const [estimatedMins, setEstimatedMins] = useState(initial?.estimated_mins ? String(initial.estimated_mins) : '')
  const [temptationBundle, setTemptationBundle] = useState(initial?.temptation_bundle || '')
  const [plannedFor, setPlannedFor] = useState(toDateTimeLocalInput(initial?.due_date))

  const isTwoMin = estimatedMins && parseInt(estimatedMins) <= 2

  return (
    <div className="space-y-4">
      <Input label="Task *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
      <Select
        label="Priority"
        value={String(priority)}
        onChange={(e) => setPriority(Number(e.target.value))}
      >
        <option value="1">🔴 High</option>
        <option value="2">🟡 Medium</option>
        <option value="3">⚪ Low</option>
      </Select>
      <Input
        label="Estimated time (minutes)"
        type="number"
        min="1"
        value={estimatedMins}
        onChange={(e) => setEstimatedMins(e.target.value)}
        placeholder="e.g. 30"
      />
      {isTwoMin && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-emerald-400">
          ⚡ Two-minute task! You can knock this out right now.
        </div>
      )}
      <Input
        label="Temptation bundle (optional)"
        value={temptationBundle}
        onChange={(e) => setTemptationBundle(e.target.value)}
        placeholder="After this task, I'll enjoy..."
      />
      <div className="space-y-1.5">
        <Input
          label="Planned for (optional)"
          type="datetime-local"
          value={plannedFor}
          onChange={(e) => setPlannedFor(e.target.value)}
        />
        <p className="text-xs text-surface-500">Reminder fires once 5 minutes before this time.</p>
      </div>
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details..." rows={2} />
      <Button onClick={() => onSave({ title, notes, priority, estimated_mins: estimatedMins ? parseInt(estimatedMins) : null, due_date: fromDateTimeLocalInput(plannedFor), temptation_bundle: temptationBundle || null })} disabled={!title.trim()} className="w-full">
        {submitLabel}
      </Button>
    </div>
  )
}

export function TasksPage() {
  const { tasks, loading, load, create, update, complete, remove } = useTasksStore()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'quick'>('all')
  const [nowMs, setNowMs] = useState(Date.now())
  const soonThresholdMs = 60 * 60 * 1000

  useEffect(() => { load() }, [])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const displayTasks = filter === 'quick'
    ? tasks.filter((t) => t.estimated_mins && t.estimated_mins <= 2)
    : tasks

  const lateTasks = displayTasks
    .filter((t) => t.due_date && t.due_date < nowMs)
    .sort((a, b) => (a.due_date ?? Number.MAX_SAFE_INTEGER) - (b.due_date ?? Number.MAX_SAFE_INTEGER))

  const upcomingTasks = displayTasks
    .filter((t) => !t.due_date || t.due_date >= nowMs)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.due_date && b.due_date) return a.due_date - b.due_date
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      return a.created_at - b.created_at
    })

  const soonTasks = upcomingTasks
    .filter((t) => t.due_date && t.due_date >= nowMs && t.due_date <= nowMs + soonThresholdMs)
  const regularTasks = upcomingTasks.filter((t) => !soonTasks.some((soon) => soon.id === t.id))

  const quickCount = tasks.filter((t) => t.estimated_mins && t.estimated_mins <= 2).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-surface-400 text-sm mt-1">{tasks.length} pending tasks</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Task</Button>
      </div>

      {/* Quick wins prompt */}
      {quickCount > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
          <Sparkles className="text-emerald-400 shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-300">
              You have {quickCount} quick task{quickCount > 1 ? 's' : ''} (≤ 2 min)
            </p>
            <p className="text-xs text-emerald-500/70 mt-0.5">Clear them now — two-minute rule!</p>
          </div>
          <Button size="sm" variant="success" onClick={() => setFilter(filter === 'quick' ? 'all' : 'quick')}>
            {filter === 'quick' ? 'Show All' : 'Quick Wins'}
          </Button>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="text-center py-12 text-surface-400">Loading tasks...</div>
      ) : displayTasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-semibold mb-1">
              {filter === 'quick' ? 'No quick tasks!' : 'All clear!'}
            </p>
            <p className="text-surface-400 text-sm mb-4">
              {filter === 'quick' ? 'No tasks under 2 minutes.' : 'Add tasks to stay organized.'}
            </p>
            {filter === 'all' && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Task</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {lateTasks.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-300" />
              <p className="text-sm text-red-200 font-medium">Late tasks ({lateTasks.length})</p>
            </div>
          )}

          {soonTasks.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-center gap-2">
              <Clock size={16} className="text-amber-300" />
              <p className="text-sm text-amber-200 font-medium">Starting soon ({soonTasks.length})</p>
            </div>
          )}

          <AnimatePresence>
            {lateTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/35 hover:border-red-400/70 hover:bg-red-500/15 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 transition-all duration-300 ease-out group">
                  {/* Complete button */}
                  <button
                    onClick={() => complete(task.id)}
                    className="mt-0.5 text-red-300/80 hover:text-emerald-400 transition-colors shrink-0"
                  >
                    <CheckCircle size={20} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{task.title}</span>
                      <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.estimated_mins && task.estimated_mins <= 2 && (
                        <Badge variant="success" className="text-[10px]">
                          <Sparkles size={8} /> 2-min
                        </Badge>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-surface-300 mt-1 line-clamp-2">{task.notes}</p>
                    )}
                    {task.estimated_mins && (
                      <div className="flex items-center gap-1 mt-1 text-surface-300 text-xs">
                        <Clock size={10} /> {task.estimated_mins} min
                      </div>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-red-200 mt-1 font-medium">Planned for: {formatPlannedFor(task.due_date)}</p>
                    )}
                    {task.temptation_bundle && (
                      <p className="text-xs text-primary-300 mt-1 italic">🎁 Reward: {task.temptation_bundle}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="w-8 h-8 rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 transition-colors flex items-center justify-center"
                      aria-label={`Edit task ${task.title}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(task.id)}
                      className="w-8 h-8 rounded-lg border border-red-400/50 bg-red-500/15 text-red-200 hover:bg-red-500/25 hover:text-red-100 transition-colors flex items-center justify-center"
                      aria-label={`Delete task ${task.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {soonTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 hover:border-amber-400/45 hover:bg-amber-500/15 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 transition-all duration-300 ease-out group">
                    {/* Complete button */}
                    <button
                      onClick={() => complete(task.id)}
                      className="mt-0.5 text-amber-300/80 hover:text-emerald-400 transition-colors shrink-0"
                    >
                      <CheckCircle size={20} />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{task.title}</span>
                        <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                        {task.estimated_mins && task.estimated_mins <= 2 && (
                          <Badge variant="success" className="text-[10px]">
                            <Sparkles size={8} /> 2-min
                          </Badge>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-xs text-surface-300 mt-1 line-clamp-2">{task.notes}</p>
                      )}
                      {task.estimated_mins && (
                        <div className="flex items-center gap-1 mt-1 text-surface-300 text-xs">
                          <Clock size={10} /> {task.estimated_mins} min
                        </div>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-amber-100 mt-1 font-medium">Planned for: {formatPlannedFor(task.due_date)}</p>
                      )}
                      {task.temptation_bundle && (
                        <p className="text-xs text-primary-300 mt-1 italic">🎁 Reward: {task.temptation_bundle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="w-8 h-8 rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 transition-colors flex items-center justify-center"
                        aria-label={`Edit task ${task.title}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(task.id)}
                        className="w-8 h-8 rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors flex items-center justify-center"
                        aria-label={`Delete task ${task.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          <AnimatePresence>
            {regularTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-700 border border-surface-500/50 hover:border-surface-300/60 hover:bg-surface-700/95 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 transition-all duration-300 ease-out group">
                    {/* Complete button */}
                    <button
                      onClick={() => complete(task.id)}
                      className="mt-0.5 text-surface-500 hover:text-emerald-400 transition-colors shrink-0"
                    >
                      <CheckCircle size={20} />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{task.title}</span>
                        <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                        {task.estimated_mins && task.estimated_mins <= 2 && (
                          <Badge variant="success" className="text-[10px]">
                            <Sparkles size={8} /> 2-min
                          </Badge>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-xs text-surface-400 mt-1 line-clamp-2">{task.notes}</p>
                      )}
                      {task.estimated_mins && (
                        <div className="flex items-center gap-1 mt-1 text-surface-500 text-xs">
                          <Clock size={10} /> {task.estimated_mins} min
                        </div>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-surface-300 mt-1">Planned for: {formatPlannedFor(task.due_date)}</p>
                      )}
                      {task.temptation_bundle && (
                        <p className="text-xs text-primary-400 mt-1 italic">🎁 Reward: {task.temptation_bundle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="w-8 h-8 rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 transition-colors flex items-center justify-center"
                        aria-label={`Edit task ${task.title}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(task.id)}
                        className="w-8 h-8 rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors flex items-center justify-center"
                        aria-label={`Delete task ${task.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Task">
        <TaskForm
          onSave={async (data) => {
            await create({
              title: data.title!,
              notes: data.notes || null,
              priority: data.priority || 2,
              estimated_mins: data.estimated_mins || null,
              due_date: data.due_date || null,
              habit_id: null,
              temptation_bundle: data.temptation_bundle || null
            })
            setShowForm(false)
          }}
        />
      </Modal>

      {editingTask && (
        <Modal open onClose={() => setEditingTask(null)} title={`Edit Task - ${editingTask.title}`}>
          <TaskForm
            initial={editingTask}
            submitLabel="Save Changes"
            onSave={async (data) => {
              await update(editingTask.id, {
                title: data.title,
                notes: data.notes || null,
                priority: data.priority || 2,
                estimated_mins: data.estimated_mins || null,
                due_date: data.due_date || null,
                temptation_bundle: data.temptation_bundle || null
              })
              setEditingTask(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
