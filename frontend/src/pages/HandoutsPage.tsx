import { useEffect, useState } from 'react'
import {
  Plus,
  X,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  ExternalLink,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useClassStore } from '../store/classStore'
import { useAuth } from '../hooks/useAuth'
import { client } from '../api/client'
import type { Handout } from '../types'

function getFileIcon(fileType: string) {
  if (fileType.includes('image')) return <Image size={20} />
  if (fileType.includes('video')) return <Film size={20} />
  if (fileType.includes('audio')) return <Music size={20} />
  if (fileType.includes('zip') || fileType.includes('archive')) return <Archive size={20} />
  return <FileText size={20} />
}

function getFileIconColor(fileType: string): string {
  if (fileType.includes('image')) return '#34C759'
  if (fileType.includes('video')) return '#FF9F0A'
  if (fileType.includes('audio')) return '#BF5AF2'
  if (fileType.includes('pdf')) return '#FF3B30'
  return '#007AFF'
}

interface NewHandoutForm {
  title: string
  description: string
  file_url: string
  file_type: string
  class_id: string
}

export default function HandoutsPage() {
  const { classes, fetchClasses } = useClassStore()
  const { isTeacher, isAdmin } = useAuth()
  const [handouts, setHandouts] = useState<Handout[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<NewHandoutForm>({
    title: '',
    description: '',
    file_url: '',
    file_type: 'application/pdf',
    class_id: '',
  })

  const fetchHandouts = async () => {
    setLoading(true)
    try {
      const data = await client.get<Handout[]>('/handouts')
      setHandouts(data)
    } catch {
      setHandouts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHandouts()
    fetchClasses()
  }, [fetchClasses])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.file_url.trim() || !form.class_id) return
    setCreating(true)
    setError(null)
    try {
      const newHandout = await client.post<Handout>('/handouts', {
        title: form.title.trim(),
        description: form.description.trim(),
        file_url: form.file_url.trim(),
        file_type: form.file_type,
        class_id: form.class_id,
      })
      setHandouts((prev) => [newHandout, ...prev])
      setShowCreateModal(false)
      setForm({ title: '', description: '', file_url: '', file_type: 'application/pdf', class_id: '' })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const getClassName = (classId: string) =>
    classes.find((c) => c.id === classId)?.name ?? classId

  const fileTypes = [
    { value: 'application/pdf', label: 'PDF' },
    { value: 'image/png', label: 'Bild (PNG)' },
    { value: 'image/jpeg', label: 'Bild (JPEG)' },
    { value: 'video/mp4', label: 'Video (MP4)' },
    { value: 'application/zip', label: 'ZIP-Archiv' },
    { value: 'text/plain', label: 'Textdatei' },
    { value: 'application/msword', label: 'Word-Dokument' },
  ]

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Header
          title="Handouts"
          actions={
            isTeacher || isAdmin ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 active:scale-95 min-h-[36px]"
                style={{ backgroundColor: '#007AFF' }}
              >
                <Plus size={16} />
                Neues Handout
              </button>
            ) : undefined
          }
        />

        <div className="flex-1 ios-scroll px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Lade Handouts...</p>
            </div>
          ) : handouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-[#8E8E93]">Noch keine Handouts vorhanden.</p>
              {(isTeacher || isAdmin) && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: '#007AFF' }}
                >
                  Erstes Handout erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {handouts.map((handout) => {
                const iconColor = getFileIconColor(handout.file_type)
                return (
                  <div
                    key={handout.id}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ backgroundColor: '#1C1C1E' }}
                  >
                    {/* File type icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${iconColor}20`, color: iconColor }}
                    >
                      {getFileIcon(handout.file_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{handout.title}</h3>
                      {handout.description && (
                        <p className="text-[#8E8E93] text-sm mt-0.5 line-clamp-1">
                          {handout.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#2C2C2E', color: '#8E8E93' }}
                        >
                          {getClassName(handout.class_id)}
                        </span>
                        <span className="text-xs text-[#8E8E93]">
                          {new Date(handout.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>

                    {/* Open link */}
                    <a
                      href={handout.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[#007AFF] hover:bg-[#2C2C2E] transition-all duration-200 shrink-0"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create handout modal */}
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
                <h3 className="text-white font-semibold text-lg">Neues Handout</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#2C2C2E]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 ios-scroll flex-1 overflow-y-auto">
                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Handout-Titel"
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Beschreibung
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optionale Beschreibung..."
                    rows={2}
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] resize-none"
                  />
                </div>

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Datei-URL
                  </label>
                  <input
                    type="url"
                    value={form.file_url}
                    onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                    placeholder="https://..."
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Dateityp
                  </label>
                  <select
                    value={form.file_type}
                    onChange={(e) => setForm({ ...form, file_type: e.target.value })}
                    className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px] appearance-none"
                  >
                    {fileTypes.map((ft) => (
                      <option key={ft.value} value={ft.value} style={{ backgroundColor: '#2C2C2E' }}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Klasse
                  </label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px] appearance-none"
                  >
                    <option value="" style={{ backgroundColor: '#2C2C2E' }}>Klasse auswählen</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id} style={{ backgroundColor: '#2C2C2E' }}>
                        {cls.name} — {cls.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-[#FF3B30] text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={!form.title.trim() || !form.file_url.trim() || !form.class_id || creating}
                  className="w-full py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 min-h-[52px]"
                  style={{
                    backgroundColor:
                      form.title.trim() && form.file_url.trim() && form.class_id && !creating
                        ? '#007AFF'
                        : '#2C2C2E',
                    color:
                      form.title.trim() && form.file_url.trim() && form.class_id && !creating
                        ? '#fff'
                        : '#8E8E93',
                  }}
                >
                  {creating ? 'Wird erstellt...' : 'Handout erstellen'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
