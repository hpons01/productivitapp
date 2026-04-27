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
}

interface TasksState {
  tasks: Task[]
  loading: boolean
  load: () => Promise<void>
  create: (data: Omit<Task, 'id' | 'created_at' | 'completed_at'>) => Promise<void>
  update: (id: string, data: Partial<Task>) => Promise<void>
  complete: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const tasks = await api().tasks.list()
      set({ tasks, loading: false })
    } catch {
      set({ loading: false })
    }
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
