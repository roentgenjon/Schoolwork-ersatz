import { create } from 'zustand'
import { client } from '../api/client'
import type { Assignment, Submission } from '../types'

interface AssignmentStore {
  assignments: Assignment[]
  submissions: Record<string, Submission[]>
  loading: boolean
  error: string | null
  fetchAssignments: () => Promise<void>
  fetchSubmissions: (assignmentId: string) => Promise<void>
  createAssignment: (data: Omit<Assignment, 'id' | 'created_at' | 'created_by'>) => Promise<void>
  submitAssignment: (assignmentId: string) => Promise<void>
  gradeSubmission: (submissionId: string, score: number, feedback: string) => Promise<void>
}

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  assignments: [],
  submissions: {},
  loading: false,
  error: null,

  fetchAssignments: async () => {
    set({ loading: true, error: null })
    try {
      const assignments = await client.get<Assignment[]>('/assignments')
      set({ assignments, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchSubmissions: async (assignmentId: string) => {
    try {
      const submissions = await client.get<Submission[]>(`/assignments/${assignmentId}/submissions`)
      set((state) => ({
        submissions: { ...state.submissions, [assignmentId]: submissions },
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  createAssignment: async (data) => {
    set({ loading: true, error: null })
    try {
      const assignment = await client.post<Assignment>('/assignments', data)
      set((state) => ({
        assignments: [...state.assignments, assignment],
        loading: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  submitAssignment: async (assignmentId: string) => {
    try {
      const submission = await client.post<Submission>(`/assignments/${assignmentId}/submit`, {})
      set((state) => {
        const existing = state.submissions[assignmentId] ?? []
        const updated = existing.map((s) =>
          s.assignment_id === assignmentId ? submission : s
        )
        if (!existing.find((s) => s.id === submission.id)) {
          updated.push(submission)
        }
        return { submissions: { ...state.submissions, [assignmentId]: updated } }
      })
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  gradeSubmission: async (submissionId: string, score: number, feedback: string) => {
    try {
      const updated = await client.put<Submission>(`/submissions/${submissionId}/grade`, {
        score,
        feedback,
      })
      set((state) => {
        const newSubmissions: Record<string, Submission[]> = {}
        for (const [key, subs] of Object.entries(state.submissions)) {
          newSubmissions[key] = subs.map((s) => (s.id === submissionId ? updated : s))
        }
        return { submissions: newSubmissions }
      })
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  // expose get for external usage
  getState: () => get(),
}))
