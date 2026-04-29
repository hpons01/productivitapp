import { useEffect, useState, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, CheckCircle, Clock, Pencil, Sparkles, AlertTriangle, Zap, Columns3, ListTodo, FolderPlus, Check, X } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input, Textarea } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Modal } from '../../components/ui/modal'
import { Badge } from '../../components/ui/badge'
import { useTasksStore, Task, TaskProject } from '../../stores/tasks.store'
import { getEnergyZone, type EnergyZone } from '../../lib/science/energy-zones'

const api = () => window.api

const PRIORITY_LABELS = ['', 'High', 'Medium', 'Low']
const PRIORITY_COLORS: Record<number, string> = {
  1: 'danger', 2: 'warning', 3: 'default'
}

const KANBAN_COLUMNS: Array<{ key: Task['progress']; label: string; tone: string; helper: string }> = [
  { key: 'backlog', label: 'Backlog', tone: 'surface', helper: 'Rough ideas and drafts.' },
  { key: 'not_started', label: 'Not Started', tone: 'primary', helper: 'Ready to start next.' },
  { key: 'ongoing', label: 'Ongoing', tone: 'amber', helper: 'Active work in progress.' },
  { key: 'done', label: 'Done', tone: 'emerald', helper: 'Completed and celebrated.' }
]

const KANBAN_PROGRESS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'done', label: 'Done' }
] as const

function isTaskEnergyFit(task: Task, zoneLevel: number): boolean {
  if (zoneLevel >= 4) {
    return task.priority === 1 || (task.estimated_mins !== null && task.estimated_mins >= 25)
  }

  if (zoneLevel === 3) {
    return task.priority >= 2 || (task.estimated_mins !== null && task.estimated_mins <= 45)
  }

  return task.estimated_mins !== null && task.estimated_mins <= 15
}

function energyTaskScore(task: Task, zoneLevel: number): number {
  const isFit = isTaskEnergyFit(task, zoneLevel)
  const effortScore = task.estimated_mins ?? 20
  const urgencyScore = task.due_date ? 10000000000000 - task.due_date : 0

  if (zoneLevel >= 4) {
    const deepWorkScore = task.priority === 1 ? 200 : 0
    return (isFit ? 1000 : 0) + deepWorkScore + effortScore + urgencyScore
  }

  if (zoneLevel === 3) {
    const balancedPriority = task.priority === 2 ? 180 : task.priority === 1 ? 140 : 120
    return (isFit ? 1000 : 0) + balancedPriority + Math.max(0, 60 - effortScore) + urgencyScore
  }

  const lowEnergyScore = task.estimated_mins !== null ? Math.max(0, 80 - task.estimated_mins * 3) : 0
  return (isFit ? 1000 : 0) + lowEnergyScore + (task.priority === 1 ? 50 : 20) + urgencyScore
}

function energySortExplanation(zoneLevel: number): string {
  if (zoneLevel >= 4) {
    return 'Energy Sort prioritizes deep, high-priority tasks and longer work blocks while your energy is high.'
  }

  if (zoneLevel === 3) {
    return 'Energy Sort balances priority with moderate effort so you can keep steady momentum.'
  }

  return 'Energy Sort surfaces shorter, lower-friction tasks to maintain progress during low-energy periods.'
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

function KanbanTaskForm({
  onSave,
  projects,
  initial,
  submitLabel = 'Add Task'
}: {
  onSave: (data: Partial<Task>) => void
  projects: TaskProject[]
  initial?: Partial<Task>
  submitLabel?: string
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [priority, setPriority] = useState(initial?.priority || 2)
  const [estimatedMins, setEstimatedMins] = useState(initial?.estimated_mins ? String(initial.estimated_mins) : '')
  const [temptationBundle, setTemptationBundle] = useState(initial?.temptation_bundle || '')
  const [plannedFor, setPlannedFor] = useState(toDateTimeLocalInput(initial?.due_date))
  const [progress, setProgress] = useState<Task['progress']>(initial?.progress || 'backlog')
  const [projectId, setProjectId] = useState(initial?.project_id || projects[0]?.id || '')

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id)
    }
  }, [projects, projectId])

  const canSubmit = Boolean(title.trim()) && Boolean(projectId)

  return (
    <div className="space-y-4">
      <Input label="Task *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name the work" />
      <Select
        label="Project"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
      >
        <option value="" disabled>Select a project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </Select>
      <Select
        label="Progress"
        value={progress}
        onChange={(e) => setProgress(e.target.value as Task['progress'])}
      >
        {KANBAN_PROGRESS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
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
        placeholder="e.g. 45"
      />
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
      <Button
        onClick={() => onSave({
          title,
          notes,
          priority,
          estimated_mins: estimatedMins ? parseInt(estimatedMins) : null,
          due_date: fromDateTimeLocalInput(plannedFor),
          temptation_bundle: temptationBundle || null,
          progress,
          project_id: projectId
        })}
        disabled={!canSubmit}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </div>
  )
}

export function TasksPage() {
  const {
    tasks,
    projects,
    loading,
    projectsLoading,
    load,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    create,
    update,
    complete,
    remove
  } = useTasksStore()
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [showForm, setShowForm] = useState(false)
  const [showKanbanForm, setShowKanbanForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'quick'>('all')
  const [sortMode, setSortMode] = useState<'priority' | 'energy'>('priority')
  const [energyZone, setEnergyZone] = useState<EnergyZone | null>(null)
  const [nowMs, setNowMs] = useState(Date.now())
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [projectEditName, setProjectEditName] = useState('')
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [kanbanSeed, setKanbanSeed] = useState<Partial<Task> | null>(null)
  const [projectPendingDelete, setProjectPendingDelete] = useState<TaskProject | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<Task['progress'] | null>(null)
  const soonThresholdMs = 60 * 60 * 1000

  useEffect(() => {
    void load()
    void loadProjects()
    void (async () => {
      try {
        const latest = await api().energy.latest()
        if (latest && typeof latest.energy === 'number') {
          setEnergyZone(getEnergyZone(latest.energy))
        }
      } catch {
        setEnergyZone(null)
      }
    })()
  }, [])

  useEffect(() => {
    if (projects.length === 0) return
    if (selectedProjectId) return
    const stored = localStorage.getItem('kanban:lastProjectId')
    const exists = stored && projects.some((p) => p.id === stored)
    setSelectedProjectId(exists ? stored : projects[0].id)
  }, [projects, selectedProjectId])

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    localStorage.setItem('kanban:lastProjectId', id)
  }

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const classicTasks = tasks.filter((task) => (task.task_type ?? 'classic') === 'classic')
  const kanbanTasks = tasks.filter((task) => (task.task_type ?? 'classic') === 'kanban')

  const displayTasks = filter === 'quick'
    ? classicTasks.filter((t) => t.estimated_mins && t.estimated_mins <= 2)
    : classicTasks

  const activeProjectTasks = selectedProjectId
    ? kanbanTasks.filter((task) => task.project_id === selectedProjectId)
    : []

  const getTaskOrderValue = (task: Task) => task.sort_order ?? task.created_at
  const sortByOrder = (items: Task[]) => [...items].sort((a, b) => getTaskOrderValue(a) - getTaskOrderValue(b))

  const lateTasks = displayTasks
    .filter((t) => t.due_date && t.due_date < nowMs)
    .sort((a, b) => (a.due_date ?? Number.MAX_SAFE_INTEGER) - (b.due_date ?? Number.MAX_SAFE_INTEGER))

  const upcomingTasks = displayTasks
    .filter((t) => !t.due_date || t.due_date >= nowMs)
    .sort((a, b) => {
      if (sortMode === 'energy' && energyZone) {
        const aScore = energyTaskScore(a, energyZone.level)
        const bScore = energyTaskScore(b, energyZone.level)
        if (aScore !== bScore) return bScore - aScore
      }

      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.due_date && b.due_date) return a.due_date - b.due_date
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1
      return a.created_at - b.created_at
    })

  const soonTasks = upcomingTasks
    .filter((t) => t.due_date && t.due_date >= nowMs && t.due_date <= nowMs + soonThresholdMs)
  const regularTasks = upcomingTasks.filter((t) => !soonTasks.some((soon) => soon.id === t.id))

  const quickCount = classicTasks.filter((t) => t.estimated_mins && t.estimated_mins <= 2).length
  const recommendedCount = energyZone
    ? displayTasks.filter((t) => isTaskEnergyFit(t, energyZone.level)).length
    : 0

  const handleCreateProject = async () => {
    const trimmed = newProjectName.trim()
    if (!trimmed) return
    const project = await createProject(trimmed)
    setNewProjectName('')
    handleSelectProject(project.id)
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null

  const startProjectEdit = () => {
    if (!selectedProject) return
    setProjectEditName(selectedProject.name)
    setIsEditingProject(true)
  }

  const cancelProjectEdit = () => {
    setProjectEditName('')
    setIsEditingProject(false)
  }

  const handleProjectRename = async () => {
    if (!selectedProject) return
    const trimmed = projectEditName.trim()
    if (!trimmed) return
    await updateProject(selectedProject.id, trimmed)
    setIsEditingProject(false)
  }

  const handleProjectDelete = () => {
    if (!selectedProject) return
    setProjectPendingDelete(selectedProject)
  }

  const confirmProjectDelete = async () => {
    if (!projectPendingDelete) return
    await deleteProject(projectPendingDelete.id)
    if (selectedProjectId === projectPendingDelete.id) {
      setSelectedProjectId(null)
      localStorage.removeItem('kanban:lastProjectId')
    }
    setProjectPendingDelete(null)
  }

  const handleProgressChange = async (task: Task, next: Task['progress']) => {
    if (task.progress === next) return
    if (next === 'done') {
      if (task.completed_at) return
      await update(task.id, { progress: 'done' })
      await complete(task.id)
      return
    }
    await update(task.id, { progress: next })
  }

  const computeSortOrder = (prevTask?: Task, nextTask?: Task): number => {
    const prevOrder = prevTask ? getTaskOrderValue(prevTask) : null
    const nextOrder = nextTask ? getTaskOrderValue(nextTask) : null

    if (prevOrder !== null && nextOrder !== null) {
      if (prevOrder === nextOrder) return prevOrder + 1
      return Math.floor((prevOrder + nextOrder) / 2)
    }

    if (prevOrder !== null) return prevOrder + 1000
    if (nextOrder !== null) return nextOrder - 1000
    return Date.now()
  }

  const applyDrop = async (taskId: string, progress: Task['progress'], targetTaskId?: string, position?: 'before' | 'after') => {
    const task = kanbanTasks.find((item) => item.id === taskId)
    if (!task) return

    const columnTasks = sortByOrder(activeProjectTasks.filter((item) => item.progress === progress))
    let prevTask: Task | undefined
    let nextTask: Task | undefined

    if (targetTaskId) {
      const targetIndex = columnTasks.findIndex((item) => item.id === targetTaskId)
      if (targetIndex >= 0) {
        if (position === 'before') {
          prevTask = columnTasks[targetIndex - 1]
          nextTask = columnTasks[targetIndex]
        } else {
          prevTask = columnTasks[targetIndex]
          nextTask = columnTasks[targetIndex + 1]
        }
      }
    } else {
      prevTask = columnTasks[columnTasks.length - 1]
    }

    const sortOrder = computeSortOrder(prevTask, nextTask)

    if (progress === 'done') {
      await update(task.id, { progress: 'done', sort_order: sortOrder })
      if (!task.completed_at) {
        await complete(task.id)
      }
      return
    }

    await update(task.id, { progress, sort_order: sortOrder })
  }

  const handleColumnDrop = (progress: Task['progress']) => async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')
    if (!taskId) return
    await applyDrop(taskId, progress)
    setDragOverTaskId(null)
    setDragOverPosition(null)
    setDragOverColumn(null)
  }

  const openKanbanForm = (seed?: Partial<Task>) => {
    setKanbanSeed({
      progress: seed?.progress ?? 'backlog',
      project_id: seed?.project_id ?? selectedProjectId ?? undefined
    })
    setShowKanbanForm(true)
  }

  const containerClassName = view === 'kanban'
    ? 'max-w-6xl mx-auto space-y-6'
    : 'max-w-3xl mx-auto space-y-6'
  const subtitleText = view === 'list'
    ? `${classicTasks.length} pending tasks`
    : `${activeProjectTasks.length} tasks on this board`

  return (
    <div className={containerClassName}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{subtitleText}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-surface-500/60 bg-surface-700/60 p-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === 'list'
                  ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/40 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_8px_20px_rgba(16,185,129,0.15)]'
                  : 'text-surface-300 hover:text-[color:var(--app-interactive-fg-default)]'
              }`}
            >
              <ListTodo size={14} /> List
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === 'kanban'
                  ? 'bg-sky-500/15 text-sky-100 border border-sky-400/40 shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_8px_20px_rgba(56,189,248,0.15)]'
                  : 'text-surface-300 hover:text-[color:var(--app-interactive-fg-default)]'
              }`}
            >
              <Columns3 size={14} /> Kanban
            </button>
          </div>
          {view === 'list' ? (
            <Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Task</Button>
          ) : (
            <Button onClick={() => openKanbanForm()}><Plus size={16} /> Add Kanban Task</Button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <>
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

          {energyZone && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-2xl p-4 flex items-start gap-3">
              <Zap className="text-primary-300 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-primary-100">
                  Current energy: {energyZone.emoji} {energyZone.label}
                </p>
                <p className="text-xs text-primary-200/80 mt-0.5">{energyZone.recommendation}</p>
                <p className="text-xs text-primary-200/80 mt-1">
                  {recommendedCount} task{recommendedCount !== 1 ? 's' : ''} currently match this energy zone.
                </p>
                <p className="text-xs text-primary-200/70 mt-1">
                  {energySortExplanation(energyZone.level)}
                </p>
              </div>
              <Button
                size="sm"
                variant={sortMode === 'energy' ? 'primary' : 'secondary'}
                onClick={() => setSortMode(sortMode === 'energy' ? 'priority' : 'energy')}
              >
                {sortMode === 'energy' ? 'Priority Sort' : 'Energy Sort'}
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
                <p className="text-[color:var(--app-interactive-fg-default)] font-semibold mb-1">
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
                          <span className="text-sm font-medium text-[color:var(--app-interactive-fg-default)]">{task.title}</span>
                          <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {energyZone && isTaskEnergyFit(task, energyZone.level) && (
                            <Badge variant="default" className="text-[10px]">
                              {energyZone.emoji} energy-fit
                            </Badge>
                          )}
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
                            <span className="text-sm font-medium text-[color:var(--app-interactive-fg-default)]">{task.title}</span>
                            <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                              {PRIORITY_LABELS[task.priority]}
                            </Badge>
                            {energyZone && isTaskEnergyFit(task, energyZone.level) && (
                              <Badge variant="default" className="text-[10px]">
                                {energyZone.emoji} energy-fit
                              </Badge>
                            )}
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
                      <div className="flex items-start gap-3 p-4 rounded-2xl bg-surface-700 border border-surface-500/50 hover:border-surface-300/60 ui-bg-hover hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 transition-all duration-300 ease-out group">
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
                            <span className="text-sm font-medium text-[color:var(--app-interactive-fg-default)]">{task.title}</span>
                            <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                              {PRIORITY_LABELS[task.priority]}
                            </Badge>
                            {energyZone && isTaskEnergyFit(task, energyZone.level) && (
                              <Badge variant="default" className="text-[10px]">
                                {energyZone.emoji} energy-fit
                              </Badge>
                            )}
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
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-surface-600/60 bg-surface-800/80 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[220px]">
                <Select
                  label="Project"
                  value={selectedProjectId ?? ''}
                  onChange={(e) => { if (e.target.value) handleSelectProject(e.target.value) }}
                >
                  <option value="" disabled>Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </Select>
              </div>
              {selectedProject && (
                <div className="flex flex-wrap items-end gap-2">
                  {isEditingProject ? (
                    <>
                      <Input
                        label="Rename"
                        value={projectEditName}
                        onChange={(e) => setProjectEditName(e.target.value)}
                      />
                      <Button size="sm" variant="secondary" onClick={handleProjectRename} disabled={!projectEditName.trim()}>
                        <Check size={14} /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelProjectEdit}>
                        <X size={14} /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" onClick={startProjectEdit}>
                        <Pencil size={14} /> Rename
                      </Button>
                      <Button size="sm" variant="danger" onClick={handleProjectDelete}>
                        <Trash2 size={14} /> Delete
                      </Button>
                    </>
                  )}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Input
                  label="New project"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Add a project"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                >
                  <FolderPlus size={14} /> Add
                </Button>
              </div>
            </div>
            {projectsLoading ? (
              <p className="text-xs text-surface-400">Loading projects...</p>
            ) : projects.length === 0 ? (
              <p className="text-xs text-surface-400">Create your first project to start a board.</p>
            ) : (
              <p className="text-xs text-surface-500">
                Drag tasks across columns to update their status.
              </p>
            )}
          </div>

          {selectedProjectId ? (
            <div className="grid gap-4 lg:grid-cols-4">
              {KANBAN_COLUMNS.map((column) => {
                const columnTasks = sortByOrder(activeProjectTasks.filter((task) => task.progress === column.key))
                const columnTone =
                  column.tone === 'primary'
                    ? 'border-primary-500/40 bg-primary-500/10'
                    : column.tone === 'amber'
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : column.tone === 'emerald'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-surface-500/50 bg-surface-700/70'

                return (
                  <div
                    key={column.key}
                    onDrop={handleColumnDrop(column.key)}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (dragOverColumn !== column.key) {
                        setDragOverTaskId(null)
                        setDragOverPosition(null)
                      }
                      setDragOverColumn(column.key)
                    }}
                    className={`rounded-2xl border ${columnTone} p-3 h-[70vh] min-h-[320px] flex flex-col transition-all ${
                      draggingTaskId && dragOverColumn === column.key
                        ? 'ring-1 ring-sky-400/40 shadow-[0_0_24px_rgba(56,189,248,0.1)]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--app-interactive-fg-default)]">{column.label}</p>
                        <p className="text-xs text-surface-400">{column.helper}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-[10px]">{columnTasks.length}</Badge>
                        <button
                          onClick={() => openKanbanForm({ progress: column.key, project_id: selectedProjectId ?? undefined })}
                          className="w-7 h-7 rounded-lg border border-surface-500/50 bg-surface-800/80 text-surface-300 hover:text-sky-100 hover:border-sky-400/60 hover:bg-sky-500/15 transition-colors flex items-center justify-center"
                          aria-label={`Add task to ${column.label}`}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 flex-1 overflow-y-auto pr-1">
                      {columnTasks.length === 0 ? (
                        <div
                          className={`border border-dashed rounded-xl p-4 text-xs text-center transition-colors ${
                            draggingTaskId && dragOverColumn === column.key
                              ? 'border-sky-400/70 text-sky-200 bg-sky-500/10'
                              : 'border-surface-500/60 text-surface-500'
                          }`}
                        >
                          Drop tasks here
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          const showDropBefore = draggingTaskId && dragOverTaskId === task.id && dragOverPosition === 'before'
                          const showDropAfter = draggingTaskId && dragOverTaskId === task.id && dragOverPosition === 'after'

                          return (
                            <div key={task.id} className="space-y-2">
                              {showDropBefore && (
                                <div className="h-2 rounded-full bg-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.45)]" />
                              )}
                              <div
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('text/plain', task.id)
                                  setDraggingTaskId(task.id)
                                }}
                                onDragEnd={() => {
                                  setDraggingTaskId(null)
                                  setDragOverTaskId(null)
                                  setDragOverPosition(null)
                                  setDragOverColumn(null)
                                }}
                                onDragOver={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  const rect = event.currentTarget.getBoundingClientRect()
                                  const midpoint = rect.top + rect.height / 2
                                  const deadZone = 8
                                  setDragOverTaskId(task.id)
                                  setDragOverColumn(column.key)
                                  if (event.clientY < midpoint - deadZone) {
                                    setDragOverPosition('before')
                                  } else if (event.clientY > midpoint + deadZone) {
                                    setDragOverPosition('after')
                                  }
                                  // within dead zone: keep current position (no flip)
                                }}
                                onDrop={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  const droppedId = event.dataTransfer.getData('text/plain')
                                  if (!droppedId) return
                                  void applyDrop(droppedId, column.key, task.id, dragOverPosition ?? 'after')
                                  setDragOverTaskId(null)
                                  setDragOverPosition(null)
                                  setDragOverColumn(null)
                                }}
                                className={`rounded-xl border bg-surface-800/80 p-3 space-y-2 transition-all cursor-grab active:cursor-grabbing ${
                                  draggingTaskId === task.id
                                    ? 'opacity-40 scale-[0.97] border-surface-500/30 shadow-none'
                                    : 'border-surface-500/40 hover:border-surface-300/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-[color:var(--app-interactive-fg-default)]">{task.title}</p>
                                    {task.notes && (
                                      <p className="text-xs text-surface-400 mt-1 line-clamp-2">{task.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setEditingTask(task)}
                                      className="w-7 h-7 rounded-lg border border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-sky-200 transition-colors flex items-center justify-center"
                                      aria-label={`Edit task ${task.title}`}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => remove(task.id)}
                                      className="w-7 h-7 rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors flex items-center justify-center"
                                      aria-label={`Delete task ${task.title}`}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant={PRIORITY_COLORS[task.priority] as 'danger' | 'warning' | 'default'} className="text-[10px]">
                                    {PRIORITY_LABELS[task.priority]}
                                  </Badge>
                                  {task.estimated_mins && (
                                    <Badge variant="default" className="text-[10px]">
                                      <Clock size={10} /> {task.estimated_mins} min
                                    </Badge>
                                  )}
                                  {task.due_date && (
                                    <Badge variant="default" className="text-[10px]">
                                      {formatPlannedFor(task.due_date)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {showDropAfter && (
                                <div className="h-2 rounded-full bg-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.45)]" />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-4xl mb-3">📌</div>
                <p className="text-[color:var(--app-interactive-fg-default)] font-semibold mb-1">
                  Choose a project to see its board.
                </p>
                <p className="text-surface-400 text-sm">Create a project to begin organizing work.</p>
              </CardContent>
            </Card>
          )}
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
              temptation_bundle: data.temptation_bundle || null,
              task_type: 'classic',
              progress: 'not_started',
              project_id: null,
              sort_order: Date.now()
            })
            setShowForm(false)
          }}
        />
      </Modal>

      <Modal open={showKanbanForm} onClose={() => setShowKanbanForm(false)} title="New Kanban Task">
        <KanbanTaskForm
          projects={projects}
          initial={kanbanSeed ?? undefined}
          onSave={async (data) => {
            await create({
              title: data.title!,
              notes: data.notes || null,
              priority: data.priority || 2,
              estimated_mins: data.estimated_mins || null,
              due_date: data.due_date || null,
              habit_id: null,
              temptation_bundle: data.temptation_bundle || null,
              task_type: 'kanban',
              progress: data.progress || 'backlog',
              project_id: data.project_id || null,
              sort_order: Date.now()
            })
            setKanbanSeed(null)
            setShowKanbanForm(false)
          }}
        />
      </Modal>

      {editingTask && (
        <Modal open onClose={() => setEditingTask(null)} title={`Edit Task - ${editingTask.title}`}>
          {editingTask.task_type === 'kanban' ? (
            <KanbanTaskForm
              projects={projects}
              initial={editingTask}
              submitLabel="Save Changes"
              onSave={async (data) => {
                await update(editingTask.id, {
                  title: data.title,
                  notes: data.notes || null,
                  priority: data.priority || 2,
                  estimated_mins: data.estimated_mins || null,
                  due_date: data.due_date || null,
                  temptation_bundle: data.temptation_bundle || null,
                  progress: data.progress || 'backlog',
                  project_id: data.project_id || null
                })
                setEditingTask(null)
              }}
            />
          ) : (
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
          )}
        </Modal>
      )}

      {projectPendingDelete && (
        <Modal open onClose={() => setProjectPendingDelete(null)} title="Delete Project">
          <div className="space-y-4">
            <p className="text-sm text-surface-200">
              Delete <span className="font-semibold text-[color:var(--app-interactive-fg-default)]">{projectPendingDelete.name}</span>?
              Tasks will remain, but their project link will be cleared.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setProjectPendingDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmProjectDelete}>Delete project</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
