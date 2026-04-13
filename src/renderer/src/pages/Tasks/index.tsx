import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, CheckCircle, Clock, Star, Sparkles } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Textarea } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Badge } from '../../components/ui/badge'
import { useTasksStore, Task } from '../../stores/tasks.store'
import { cn } from '../../lib/utils'

const PRIORITY_LABELS = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLORS: Record<number, string> = {
  1: 'danger', 2: 'warning', 3: 'default'
}

function TaskForm({ onSave }: { onSave: (data: Partial<Task>) => void }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState(2)
  const [estimatedMins, setEstimatedMins] = useState('')
  const [temptationBundle, setTemptationBundle] = useState('')

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
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details..." rows={2} />
      <Button onClick={() => onSave({ title, notes, priority, estimated_mins: estimatedMins ? parseInt(estimatedMins) : null, temptation_bundle: temptationBundle || null })} disabled={!title.trim()} className="w-full">
        Add Task
      </Button>
    </div>
  )
}

export function TasksPage() {
  const { tasks, loading, load, create, complete, remove } = useTasksStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'quick'>('all')

  useEffect(() => { load() }, [])

  const displayTasks = filter === 'quick'
    ? tasks.filter((t) => t.estimated_mins && t.estimated_mins <= 2)
    : tasks

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
          <AnimatePresence>
            {displayTasks
              .sort((a, b) => a.priority - b.priority)
              .map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-700 border border-surface-500/50 hover:border-surface-400/40 transition-colors group">
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
                      {task.temptation_bundle && (
                        <p className="text-xs text-primary-400 mt-1 italic">🎁 Reward: {task.temptation_bundle}</p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => remove(task.id)}
                      className="text-surface-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
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
              due_date: null,
              habit_id: null,
              temptation_bundle: data.temptation_bundle || null
            })
            setShowForm(false)
          }}
        />
      </Modal>
    </div>
  )
}
