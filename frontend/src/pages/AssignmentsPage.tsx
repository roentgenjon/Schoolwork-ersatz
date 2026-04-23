import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  X,
  FileQuestion,
  FileText,
  Activity,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  Send,
  Upload,
  Download,
} from 'lucide-react'
import { clsx } from 'clsx'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useAssignmentStore } from '../store/assignmentStore'
import { useClassStore } from '../store/classStore'
import { useAuth } from '../hooks/useAuth'
import type { Assignment, AssignmentType, SubmissionStatus } from '../types'

type TabFilter = 'all' | 'pending' | 'submitted' | 'graded'

const assignmentTypeIcons: Record<AssignmentType, React.ReactNode> = {
  quiz: <FileQuestion size={16} />,
  handout: <FileText size={16} />,
  activity: <Activity size={16} />,
  book_report: <BookOpen size={16} />,
  collaboration: <Users size={16} />,
}

const assignmentTypeLabels: Record<AssignmentType, string> = {
  quiz: 'Quiz',
  handout: 'Arbeitsblatt',
  activity: 'Aktivität',
  book_report: 'Buchbericht',
  collaboration: 'Zusammenarbeit',
}

const statusColors: Record<SubmissionStatus, string> = {
  not_started: '#8E8E93',
  in_progress: '#FF9F0A',
  turned_in: '#34C759',
  returned: '#007AFF',
  graded: '#BF5AF2',
}

const statusLabels: Record<SubmissionStatus, string> = {
  not_started: 'Nicht begonnen',
  in_progress: 'In Bearbeitung',
  turned_in: 'Abgegeben',
  returned: 'Zurückgegeben',
  graded: 'Benotet',
}

const MAX_FILE_BYTES = 750 * 1024

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface NewAssignmentForm {
  title: string
  description: string
  type: AssignmentType
  class_id: string
  due_date: string
  points: string
  file_url: string
  file_name: string
}

const tabs: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'pending', label: 'Ausstehend' },
  { key: 'submitted', label: 'Abgegeben' },
  { key: 'graded', label: 'Benotet' },
]

export default function AssignmentsPage() {
  const {
    assignments,
    submissions,
    fetchAssignments,
    createAssignment,
    submitAssignment,
    fetchSubmissions,
  } = useAssignmentStore()
  const { classes, fetchClasses } = useClassStore()
  const { isTeacher, isAdmin, isStudent, user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<NewAssignmentForm>({
    title: '',
    description: '',
    type: 'quiz',
    class_id: '',
    due_date: '',
    points: '100',
    file_url: '',
    file_name: '',
  })

  useEffect(() => {
    fetchAssignments()
    fetchClasses()
  }, [fetchAssignments, fetchClasses])

  useEffect(() => {
    assignments.forEach((a) => {
      if (!submissions[a.id]) {
        fetchSubmissions(a.id)
      }
    })
  }, [assignments, submissions, fetchSubmissions])

  const getMySubmission = (assignmentId: string) => {
    if (!user) return null
    const subs = submissions[assignmentId] ?? []
    return subs.find((s) => s.student_id === user.id) ?? null
  }

  const getFilteredAssignments = (): Assignment[] => {
    if (activeTab === 'all') return assignments
    return assignments.filter((a) => {
      const sub = getMySubmission(a.id)
      if (activeTab === 'pending') {
        return !sub || sub.status === 'not_started' || sub.status === 'in_progress'
      }
      if (activeTab === 'submitted') {
        return sub?.status === 'turned_in' || sub?.status === 'returned'
      }
      if (activeTab === 'graded') {
        return sub?.status === 'graded'
      }
      return true
    })
  }

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError(`Datei zu groß. Maximal ${Math.round(MAX_FILE_BYTES / 1024)} KB erlaubt.`)
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setForm(f => ({ ...f, file_url: dataUrl, file_name: file.name }))
    setError(null)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.class_id) return
    setCreating(true)
    setError(null)
    try {
      await createAssignment({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        class_id: form.class_id,
        due_date: form.due_date ? new Date(form.due_date).getTime() : null,
        points: parseInt(form.points) || 100,
        file_url: form.file_url || null,
      })
      setShowCreateModal(false)
      setForm({
        title: '',
        description: '',
        type: 'quiz',
        class_id: '',
        due_date: '',
        points: '100',
        file_url: '',
        file_name: '',
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleSubmit = async (assignmentId: string) => {
    try {
      await submitAssignment(assignmentId)
    } catch {
      // ignore
    }
  }

  const getClassName = (classId: string) =>
    classes.find((c) => c.id === classId)?.name ?? classId

  const filteredAssignments = getFilteredAssignments()

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Header
          title="Aufgaben"
          actions={
            isTeacher || isAdmin ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 active:scale-95 min-h-[36px]"
                style={{ backgroundColor: '#007AFF' }}
              >
                <Plus size={16} />
                Neue Aufgabe
              </button>
            ) : undefined
          }
        />

        {/* Tabs */}
        <div
          className="flex gap-1 px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid #38383A' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[36px]',
                activeTab === tab.key ? 'text-white' : 'text-[#8E8E93] hover:text-white'
              )}
              style={{
                backgroundColor: activeTab === tab.key ? '#007AFF' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assignments list */}
        <div className="flex-1 ios-scroll px-6 py-4">
          {filteredAssignments.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Keine Aufgaben in dieser Kategorie.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((assignment) => {
                const mySubmission = isStudent ? getMySubmission(assignment.id) : null
                const isOverdue =
                  assignment.due_date !== null && assignment.due_date < Date.now()
                const allSubs = submissions[assignment.id] ?? []

                return (
                  <div
                    key={assignment.id}
                    className="p-4 rounded-2xl"
                    style={{ backgroundColor: '#1C1C1E' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: '#2C2C2E', color: '#007AFF' }}
                        >
                          {assignmentTypeIcons[assignment.type]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium">{assignment.title}</h3>
                          <p className="text-[#8E8E93] text-sm mt-0.5">
                            {getClassName(assignment.class_id)} &bull;{' '}
                            {assignmentTypeLabels[assignment.type]}
                          </p>
                          {assignment.description && (
                            <p className="text-[#8E8E93] text-sm mt-1 line-clamp-2">
                              {assignment.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {assignment.due_date !== null && (
                              <span
                                className="flex items-center gap-1 text-xs"
                                style={{ color: isOverdue ? '#FF3B30' : '#8E8E93' }}
                              >
                                <Clock size={12} />
                                {new Date(assignment.due_date).toLocaleDateString('de-DE')}
                              </span>
                            )}
                            <span className="text-xs text-[#8E8E93]">
                              {assignment.points} Punkte
                            </span>
                            {assignment.file_url && (
                              <button
                                onClick={() => {
                                  if (assignment.file_url!.startsWith('data:')) {
                                    const a = document.createElement('a')
                                    a.href = assignment.file_url!
                                    a.download = assignment.title
                                    a.click()
                                  } else {
                                    window.open(assignment.file_url!, '_blank', 'noopener')
                                  }
                                }}
                                className="flex items-center gap-1 text-xs"
                                style={{ color: '#007AFF' }}
                              >
                                <Download size={11} />
                                Anhang
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isStudent && mySubmission && (
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{
                              backgroundColor: `${statusColors[mySubmission.status]}20`,
                              color: statusColors[mySubmission.status],
                            }}
                          >
                            {statusLabels[mySubmission.status]}
                          </span>
                        )}
                        {isStudent &&
                          (!mySubmission ||
                            mySubmission.status === 'not_started' ||
                            mySubmission.status === 'in_progress') && (
                            <button
                              onClick={() => handleSubmit(assignment.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium transition-all duration-200 active:scale-95 min-h-[32px]"
                              style={{ backgroundColor: '#34C759' }}
                            >
                              <Send size={12} />
                              Abgeben
                            </button>
                          )}
                        {(isTeacher || isAdmin) && (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: '#8E8E93' }}
                          >
                            <CheckCircle size={12} />
                            {
                              allSubs.filter(
                                (s) =>
                                  s.status === 'turned_in' || s.status === 'graded'
                              ).length
                            }
                            /{allSubs.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create assignment modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={() => setShowCreateModal(false)}
            />
            <div
              className="relative w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 z-10 max-h-[85vh] flex flex-col"
              style={{ backgroundColor: '#1C1C1E' }}
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-white font-semibold text-lg">Neue Aufgabe</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#2C2C2E]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 ios-scroll flex-1 overflow-y-auto">
                <div
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Aufgabentitel"
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] min-h-[44px]"
                  />
                </div>

                <div
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Beschreibung
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optionale Beschreibung..."
                    rows={3}
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] resize-none"
                  />
                </div>

                {/* Optional file attachment */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: dragging ? '#007AFF20' : '#2C2C2E',
                    border: `2px dashed ${dragging ? '#007AFF' : form.file_url ? '#34C759' : '#48484A'}`,
                    minHeight: 80,
                  }}
                >
                  {form.file_url ? (
                    <>
                      <Download size={18} style={{ color: '#34C759' }} />
                      <p className="text-white text-xs font-medium text-center">{form.file_name}</p>
                      <p className="text-[#8E8E93] text-xs">Tippen zum Ändern</p>
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="text-[#8E8E93]" />
                      <p className="text-[#8E8E93] text-xs text-center">
                        Datei anhängen (optional) · Ziehen oder tippen · Max. 750 KB
                      </p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" onChange={onFileInput} accept="*/*" />
                </div>

                <div
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Typ
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({ ...form, type: e.target.value as AssignmentType })
                    }
                    className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px] appearance-none"
                  >
                    {(Object.keys(assignmentTypeLabels) as AssignmentType[]).map((type) => (
                      <option
                        key={type}
                        value={type}
                        style={{ backgroundColor: '#2C2C2E' }}
                      >
                        {assignmentTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Klasse
                  </label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px] appearance-none"
                  >
                    <option value="" style={{ backgroundColor: '#2C2C2E' }}>
                      Klasse auswählen
                    </option>
                    {classes.map((cls) => (
                      <option
                        key={cls.id}
                        value={cls.id}
                        style={{ backgroundColor: '#2C2C2E' }}
                      >
                        {cls.name} — {cls.subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="flex flex-col rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#2C2C2E' }}
                  >
                    <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                      Fällig am
                    </label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px]"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div
                    className="flex flex-col rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#2C2C2E' }}
                  >
                    <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                      Punkte
                    </label>
                    <input
                      type="number"
                      value={form.points}
                      onChange={(e) => setForm({ ...form, points: e.target.value })}
                      min="0"
                      max="1000"
                      className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px]"
                    />
                  </div>
                </div>

                {error && <p className="text-[#FF3B30] text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={!form.title.trim() || !form.class_id || creating}
                  className="w-full py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 min-h-[52px]"
                  style={{
                    backgroundColor:
                      form.title.trim() && form.class_id && !creating
                        ? '#007AFF'
                        : '#2C2C2E',
                    color:
                      form.title.trim() && form.class_id && !creating
                        ? '#fff'
                        : '#8E8E93',
                  }}
                >
                  {creating ? 'Wird erstellt...' : 'Aufgabe erstellen'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
