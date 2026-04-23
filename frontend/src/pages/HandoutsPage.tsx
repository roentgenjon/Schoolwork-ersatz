import { useEffect, useRef, useState } from 'react'
import {
  Plus,
  X,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  ExternalLink,
  Upload,
  Download,
  Pencil,
  Trash2,
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

const MAX_FILE_BYTES = 750 * 1024 // 750 KB (fits in D1 as base64)

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface NewHandoutForm {
  title: string
  description: string
  file_url: string
  file_name: string
  file_type: string
  class_id: string
}

export default function HandoutsPage() {
  const { classes, fetchClasses } = useClassStore()
  const { isTeacher, isAdmin } = useAuth()
  const [handouts, setHandouts] = useState<Handout[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingHandout, setEditingHandout] = useState<Handout | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<NewHandoutForm>({
    title: '',
    description: '',
    file_url: '',
    file_name: '',
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

  function openEdit(h: Handout) {
    setEditingHandout(h)
    setForm({
      title: h.title,
      description: h.description ?? '',
      file_url: h.file_url ?? '',
      file_name: h.file_url ? '(vorhandene Datei)' : '',
      file_type: h.file_type ?? 'application/pdf',
      class_id: h.class_id,
    })
    setError(null)
    setShowCreateModal(true)
  }

  function closeModal() {
    setShowCreateModal(false)
    setEditingHandout(null)
    setForm({ title: '', description: '', file_url: '', file_name: '', file_type: 'application/pdf', class_id: '' })
    setError(null)
  }

  async function handleDelete(h: Handout) {
    if (!confirm(`"${h.title}" wirklich löschen?`)) return
    try {
      await client.del(`/handouts/${h.id}`)
      setHandouts(prev => prev.filter(x => x.id !== h.id))
    } catch { /* ignore */ }
  }

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError(`Datei zu groß. Maximal ${Math.round(MAX_FILE_BYTES / 1024)} KB erlaubt.`)
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setForm(f => ({
      ...f,
      file_url: dataUrl,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      title: f.title || file.name.replace(/\.[^.]+$/, ''),
    }))
    setError(null)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.class_id) return
    if (!editingHandout && !form.file_url) return
    setCreating(true)
    setError(null)
    try {
      if (editingHandout) {
        const updated = await client.put<Handout>(`/handouts/${editingHandout.id}`, {
          title: form.title.trim(),
          description: form.description.trim(),
          class_id: form.class_id,
        })
        setHandouts(prev => prev.map(h => h.id === editingHandout.id ? updated : h))
      } else {
        const newHandout = await client.post<Handout>('/handouts', {
          title: form.title.trim(),
          description: form.description.trim(),
          file_url: form.file_url,
          file_type: form.file_type,
          class_id: form.class_id,
        })
        setHandouts(prev => [newHandout, ...prev])
      }
      closeModal()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const getClassName = (classId: string) =>
    classes.find(c => c.id === classId)?.name ?? classId

  function openHandout(handout: Handout) {
    if (handout.file_url.startsWith('data:')) {
      const a = document.createElement('a')
      a.href = handout.file_url
      a.download = handout.title
      a.click()
    } else {
      window.open(handout.file_url, '_blank', 'noopener')
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Header
          title="Materialien"
          actions={
            isTeacher || isAdmin ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 active:scale-95 min-h-[36px]"
                style={{ backgroundColor: '#007AFF' }}
              >
                <Plus size={16} />
                Neues Material
              </button>
            ) : undefined
          }
        />

        <div className="flex-1 ios-scroll px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Lade Materialien...</p>
            </div>
          ) : handouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-[#8E8E93]">Noch keine Materialien vorhanden.</p>
              {(isTeacher || isAdmin) && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: '#007AFF' }}
                >
                  Erstes Material erstellen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {handouts.map(handout => {
                const iconColor = getFileIconColor(handout.file_type)
                const isData = handout.file_url?.startsWith('data:')
                return (
                  <div
                    key={handout.id}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ backgroundColor: '#1C1C1E' }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${iconColor}20`, color: iconColor }}
                    >
                      {getFileIcon(handout.file_type)}
                    </div>

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

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openHandout(handout)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#007AFF] hover:bg-[#2C2C2E] transition-all duration-200"
                      >
                        {isData ? <Download size={18} /> : <ExternalLink size={18} />}
                      </button>
                      {(isTeacher || isAdmin) && (
                        <>
                          <button
                            onClick={() => openEdit(handout)}
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2C2C2E] transition-all"
                            style={{ color: '#8E8E93' }} title="Bearbeiten"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(handout)}
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2C2C2E] transition-all"
                            style={{ color: '#FF3B30' }} title="Löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              onClick={closeModal}
            />
            <div
              className="relative w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-6 z-10 max-h-[90vh] flex flex-col"
              style={{ backgroundColor: '#1C1C1E' }}
            >
              <div className="flex items-center justify-between mb-5 shrink-0">
                <h3 className="text-white font-semibold text-lg">{editingHandout ? 'Material bearbeiten' : 'Neues Material'}</h3>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#2C2C2E]"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 ios-scroll flex-1 overflow-y-auto">
                {/* File drop zone — only shown when creating, not editing */}
                {!editingHandout && <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all"
                  style={{
                    backgroundColor: dragging ? '#007AFF20' : '#2C2C2E',
                    border: `2px dashed ${dragging ? '#007AFF' : form.file_url ? '#34C759' : '#48484A'}`,
                    minHeight: 100,
                  }}
                >
                  {form.file_url ? (
                    <>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#34C75920', color: '#34C759' }}>
                        {getFileIcon(form.file_type)}
                      </div>
                      <p className="text-white text-sm font-medium text-center">{form.file_name}</p>
                      <p className="text-[#8E8E93] text-xs">Tippen zum Ändern</p>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="text-[#8E8E93]" />
                      <p className="text-white text-sm font-medium">Datei auswählen</p>
                      <p className="text-[#8E8E93] text-xs text-center">
                        Hierher ziehen oder tippen · Max. 750 KB
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={onFileInput}
                    accept="*/*"
                  />
                </div>}

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Material-Titel"
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] outline-none min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Beschreibung
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Optionale Beschreibung..."
                    rows={2}
                    className="px-4 pb-3 pt-1 bg-transparent text-white placeholder-[#48484A] resize-none outline-none"
                  />
                </div>

                <div className="flex flex-col rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                  <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide">
                    Klasse
                  </label>
                  <select
                    value={form.class_id}
                    onChange={e => setForm({ ...form, class_id: e.target.value })}
                    className="px-4 pb-3 pt-1 bg-transparent text-white min-h-[44px] appearance-none outline-none"
                  >
                    <option value="" style={{ backgroundColor: '#2C2C2E' }}>Klasse auswählen</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id} style={{ backgroundColor: '#2C2C2E' }}>
                        {cls.name} — {cls.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="text-[#FF3B30] text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={!form.title.trim() || (!editingHandout && !form.file_url) || !form.class_id || creating}
                  className="w-full py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 min-h-[52px]"
                  style={{
                    backgroundColor: form.title.trim() && form.file_url && form.class_id && !creating ? '#007AFF' : '#2C2C2E',
                    color: form.title.trim() && form.file_url && form.class_id && !creating ? '#fff' : '#8E8E93',
                  }}
                >
                  {creating ? 'Wird gespeichert...' : editingHandout ? 'Änderungen speichern' : 'Material erstellen'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
