import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import ClassCard from '../components/classes/ClassCard'
import ClassDetail from '../components/classes/ClassDetail'
import { useClassStore } from '../store/classStore'
import { useAuth } from '../hooks/useAuth'
import type { Class } from '../types'

const CLASS_COLORS = [
  '#007AFF', '#34C759', '#FF9F0A', '#FF3B30',
  '#BF5AF2', '#FF2D55', '#5AC8FA', '#30D158',
]
const CLASS_ICONS = ['📚', '🔬', '🎨', '🏃', '🎵', '🌍', '💻', '📐']

interface NewClassForm {
  name: string
  subject: string
  color: string
  icon: string
}

export default function ClassesPage() {
  const { classes, fetchClasses, createClass, deleteClass, loading } = useClassStore()
  const { isTeacher, isAdmin } = useAuth()
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState<NewClassForm>({
    name: '',
    subject: '',
    color: CLASS_COLORS[0]!,
    icon: CLASS_ICONS[0]!,
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.subject.trim()) return
    setCreating(true)
    setError(null)
    try {
      await createClass({
        name: form.name.trim(),
        subject: form.subject.trim(),
        color: form.color,
        icon: form.icon,
        teacher_id: '',
      })
      setShowCreateModal(false)
      setForm({ name: '', subject: '', color: CLASS_COLORS[0]!, icon: CLASS_ICONS[0]! })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Klasse wirklich löschen?')) return
    await deleteClass(id)
    setSelectedClass(null)
  }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Main list */}
        <div
          className={`flex flex-col ${selectedClass ? 'hidden md:flex md:w-1/2' : 'flex-1'}`}
        >
          <Header
            title="Klassen"
            actions={
              (isTeacher || isAdmin) ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 active:scale-95 min-h-[36px]"
                  style={{ backgroundColor: '#007AFF' }}
                >
                  <Plus size={16} />
                  Neue Klasse
                </button>
              ) : undefined
            }
          />
          <div className="flex-1 ios-scroll px-6 py-4">
            {loading && classes.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-[#8E8E93]">Lade Klassen...</p>
              </div>
            ) : classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <p className="text-[#8E8E93]">Noch keine Klassen vorhanden.</p>
                {(isTeacher || isAdmin) && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: '#007AFF' }}
                  >
                    Erste Klasse erstellen
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {classes.map((cls) => (
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    onClick={() => setSelectedClass(cls)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedClass && (
          <div
            className="flex flex-col flex-1 md:w-1/2"
            style={{ borderLeft: '1px solid #38383A' }}
          >
            <ClassDetail
              cls={selectedClass}
              onClose={() => setSelectedClass(null)}
              onDelete={handleDelete}
            />
          </div>
        )}

        {/* Create class modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={() => setShowCreateModal(false)}
            />
            <div
              className="relative w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-6 z-10"
              style={{ backgroundColor: '#1C1C1E' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold text-lg">Neue Klasse</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#2C2C2E]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Name */}
                <div
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Klassenname
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="z.B. Klasse 9b"
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] min-h-[44px]"
                  />
                </div>

                {/* Subject */}
                <div
                  className="flex flex-col rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Fach
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="z.B. Mathematik"
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] min-h-[44px]"
                  />
                </div>

                {/* Color picker */}
                <div>
                  <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wide mb-2">
                    Farbe
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {CLASS_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm({ ...form, color })}
                        className="w-8 h-8 rounded-full transition-all duration-200"
                        style={{
                          backgroundColor: color,
                          border: form.color === color ? '3px solid white' : '3px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon picker */}
                <div>
                  <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wide mb-2">
                    Symbol
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {CLASS_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setForm({ ...form, icon })}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-200"
                        style={{
                          backgroundColor:
                            form.icon === icon ? `${form.color}30` : '#2C2C2E',
                          border:
                            form.icon === icon
                              ? `2px solid ${form.color}`
                              : '2px solid transparent',
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-[#FF3B30] text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={!form.name.trim() || !form.subject.trim() || creating}
                  className="w-full py-4 rounded-xl text-white font-semibold transition-all duration-200 active:scale-95 min-h-[52px]"
                  style={{
                    backgroundColor:
                      form.name.trim() && form.subject.trim() && !creating
                        ? '#007AFF'
                        : '#2C2C2E',
                    color:
                      form.name.trim() && form.subject.trim() && !creating
                        ? '#fff'
                        : '#8E8E93',
                  }}
                >
                  {creating ? 'Wird erstellt...' : 'Klasse erstellen'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
