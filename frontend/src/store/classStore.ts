import { create } from 'zustand'
import { client } from '../api/client'
import type { Class } from '../types'

interface ClassStore {
  classes: Class[]
  selectedClass: Class | null
  loading: boolean
  error: string | null
  fetchClasses: () => Promise<void>
  createClass: (data: Omit<Class, 'id' | 'created_at' | 'teacher_id'>) => Promise<void>
  selectClass: (id: string) => void
  deleteClass: (id: string) => Promise<void>
}

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  selectedClass: null,
  loading: false,
  error: null,

  fetchClasses: async () => {
    set({ loading: true, error: null })
    try {
      const classes = await client.get<Class[]>('/classes')
      set({ classes, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createClass: async (data) => {
    set({ loading: true, error: null })
    try {
      const newClass = await client.post<Class>('/classes', data)
      set((state) => ({
        classes: [...state.classes, newClass],
        loading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  selectClass: (id: string) => {
    const cls = get().classes.find((c) => c.id === id) ?? null
    set({ selectedClass: cls })
  },

  deleteClass: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await client.del(`/classes/${id}`)
      set((state) => ({
        classes: state.classes.filter((c) => c.id !== id),
        selectedClass: state.selectedClass?.id === id ? null : state.selectedClass,
        loading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },
}))
