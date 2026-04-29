import { create } from 'zustand'
import { generateId } from '../lib/utils'
import { useGamificationStore } from './gamification.store'

const api = () => window.api

export interface Task {
  id: string
  title: string
  notes: string | null
  priority: number
  estimated_mins: number | null
  due_date: number | null
  completed_at: number | null
  created_at: number
  habit_id: string | null
  temptation_bundle: string | null
  task_type: 'classic' | 'kanban'
  progress: 'backlog' | 'not_started' | 'ongoing' | 'done'
  project_id: string | null
  sort_order: number | null
}

export interface TaskProject {
  id: string
  name: string
  created_at: number
}

interface TasksState {
  tasks: Task[]
  projects: TaskProject[]
  loading: boolean
  projectsLoading: boolean
  load: () => Promise<void>
  loadProjects: () => Promise<void>
  createProject: (name: string) => Promise<TaskProject>
  updateProject: (id: string, name: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  create: (data: Omit<Task, 'id' | 'created_at' | 'completed_at'>) => Promise<void>
  update: (id: string, data: Partial<Task>) => Promise<void>
  complete: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  projects: [],
  loading: false,
  projectsLoading: false,

  load: async () => {
    set({ loading: true })
    try {
      const tasks = await api().tasks.list()
      const normalized = (tasks as Task[]).map((task) => ({
        ...task,
        task_type: task.task_type ?? 'classic',
        progress: task.progress ?? 'not_started',
        project_id: task.project_id ?? null,
        sort_order: task.sort_order ?? null
      }))
      set({ tasks: normalized, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  loadProjects: async () => {
    set({ projectsLoading: true })
    try {
      const projects = await api().tasks.projects.list()
      set({ projects, projectsLoading: false })
    } catch {
      set({ projectsLoading: false })
    }
  },

  createProject: async (name: string) => {
    const project = await api().tasks.projects.create({
      id: generateId(),
      name,
      created_at: Date.now()
    })
    set((s) => ({ projects: [...s.projects, project] }))
    return project as TaskProject
  },

  updateProject: async (id: string, name: string) => {
    const updated = await api().tasks.projects.update({ id, name })
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...updated } : p)) }))
  },

  deleteProject: async (id: string) => {
    await api().tasks.projects.delete(id)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },

  create: async (data) => {
    const task = await api().tasks.create({
      id: generateId(),
      created_at: Date.now(),
      completed_at: null,
      ...data
    })
    set((s) => ({ tasks: [...s.tasks, task] }))
  },

  update: async (id, data) => {
    const updated = await api().tasks.update({ id, ...data })
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updated } : t)) }))
  },

  complete: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    // Optimistic update
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id)
    }))

    const result = await api().tasks.complete(id) as { xpAwarded?: number }
    const { refreshFromDB, triggerTaskDone } = useGamificationStore.getState()
    await refreshFromDB()

    triggerTaskDone(task.title, result?.xpAwarded ?? 10)
  },

  remove: async (id) => {
    await api().tasks.delete(id)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  }
}))
