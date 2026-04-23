import { useEffect, useState } from 'react'
import { X, Users, ClipboardList, Trash2, Pencil, Check, UserPlus, UserMinus } from 'lucide-react'
import { client } from '../../api/client'
import { useAssignmentStore } from '../../store/assignmentStore'
import { useClassStore } from '../../store/classStore'
import { useAuth } from '../../hooks/useAuth'
import type { Class, User } from '../../types'

const CLASS_COLORS = ['#007AFF', '#34C759', '#FF9F0A', '#FF3B30', '#BF5AF2', '#FF2D55', '#5AC8FA', '#30D158']
const CLASS_ICONS = ['📚', '🔬', '🎨', '🏃', '🎵', '🌍', '💻', '📐']

interface Props {
  cls: Class
  onClose: () => void
  onDelete: (id: string) => void
}

export default function ClassDetail({ cls, onClose, onDelete }: Props) {
  const [students, setStudents] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: cls.name, subject: cls.subject ?? '', color: cls.color ?? '#007AFF', icon: cls.icon ?? '📚' })
  const { assignments } = useAssignmentStore()
  const { updateClass } = useClassStore()
  const { isTeacher, isAdmin } = useAuth()
  const canEdit = isTeacher || isAdmin

  const classAssignments = assignments.filter(a => a.class_id === cls.id)

  useEffect(() => {
    setEditForm({ name: cls.name, subject: cls.subject ?? '', color: cls.color ?? '#007AFF', icon: cls.icon ?? '📚' })
  }, [cls])

  useEffect(() => {
    loadStudents()
  }, [cls.id])

  function loadStudents() {
    setLoadingStudents(true)
    client.get<User[]>(`/classes/${cls.id}/students`)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false))
  }

  async function loadAllUsers() {
    if (allUsers.length === 0) {
      const all = await client.get<User[]>('/users')
      setAllUsers(Array.isArray(all) ? all.filter(u => u.role === 'student') : [])
    }
  }

  async function handleSave() {
    if (!editForm.name.trim()) return
    setSaving(true)
    try {
      await updateClass(cls.id, {
        name: editForm.name.trim(),
        subject: editForm.subject.trim(),
        color: editForm.color,
        icon: editForm.icon,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddStudent(user: User) {
    setAddingId(user.id)
    try {
      await client.post(`/classes/${cls.id}/students`, { student_id: user.id })
      setStudents(prev => [...prev, user])
    } finally {
      setAddingId(null)
    }
  }

  async function handleRemoveStudent(user: User) {
    setRemovingId(user.id)
    try {
      await client.del(`/classes/${cls.id}/students/${user.id}`)
      setStudents(prev => prev.filter(s => s.id !== user.id))
    } finally {
      setRemovingId(null)
    }
  }

  const nonMembers = allUsers.filter(u => !students.find(s => s.id === u.id))

  const getInitials = (name: string) =>
    name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #38383A' }}>
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${editForm.color}30` }}>
              {editForm.icon}
            </div>
            <input
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1 bg-transparent text-white font-semibold text-lg outline-none min-w-0"
              placeholder="Klassenname"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${cls.color}30` }}>
              {cls.icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-semibold text-lg truncate">{cls.name}</h2>
              <p className="text-[#8E8E93] text-sm truncate">{cls.subject}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {canEdit && editing && (
            <>
              <button onClick={handleSave} disabled={saving}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E] disabled:opacity-40"
                style={{ color: '#34C759' }}>
                <Check size={18} />
              </button>
              <button onClick={() => setEditing(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E]"
                style={{ color: '#8E8E93' }}>
                <X size={18} />
              </button>
            </>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E]"
              style={{ color: '#8E8E93' }}>
              <Pencil size={16} />
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => onDelete(cls.id)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E]"
              style={{ color: '#FF3B30' }}>
              <Trash2 size={17} />
            </button>
          )}
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-[#2C2C2E]"
            style={{ color: '#8E8E93' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 ios-scroll px-5 py-4 space-y-5">
        {/* Edit fields */}
        {editing && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
              <label className="px-4 pt-3 text-xs text-[#8E8E93] font-medium uppercase tracking-wide block">Fach</label>
              <input
                value={editForm.subject}
                onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="z.B. Mathematik"
                className="px-4 pb-3 pt-1 bg-transparent text-white w-full outline-none min-h-[40px]"
              />
            </div>
            <div>
              <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wide mb-2">Farbe</p>
              <div className="flex gap-2 flex-wrap">
                {CLASS_COLORS.map(color => (
                  <button key={color} type="button" onClick={() => setEditForm(f => ({ ...f, color }))}
                    className="w-8 h-8 rounded-full transition-all"
                    style={{ backgroundColor: color, border: editForm.color === color ? '3px solid white' : '3px solid transparent' }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#8E8E93] font-medium uppercase tracking-wide mb-2">Symbol</p>
              <div className="flex gap-2 flex-wrap">
                {CLASS_ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setEditForm(f => ({ ...f, icon }))}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                    style={{
                      backgroundColor: editForm.icon === icon ? `${editForm.color}30` : '#2C2C2E',
                      border: editForm.icon === icon ? `2px solid ${editForm.color}` : '2px solid transparent',
                    }}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Students */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={15} color="#8E8E93" />
              <h3 className="text-[#8E8E93] text-xs font-semibold uppercase tracking-wide">
                Schüler ({students.length})
              </h3>
            </div>
            {canEdit && (
              <button
                onClick={() => { setShowAddStudent(v => !v); loadAllUsers() }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{ backgroundColor: showAddStudent ? '#007AFF' : '#2C2C2E', color: showAddStudent ? '#fff' : '#007AFF' }}
              >
                <UserPlus size={12} />
                Hinzufügen
              </button>
            )}
          </div>

          {/* Add student picker */}
          {showAddStudent && (
            <div className="mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
              {nonMembers.length === 0 ? (
                <p className="text-[#8E8E93] text-sm px-4 py-3">Alle Schüler sind bereits in der Klasse.</p>
              ) : (
                nonMembers.map((u, idx) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderTop: idx > 0 ? '1px solid #38383A' : 'none' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ backgroundColor: '#007AFF' }}>
                      {getInitials(u.name)}
                    </div>
                    <p className="text-white text-sm flex-1">{u.name}</p>
                    <button
                      onClick={() => handleAddStudent(u)}
                      disabled={addingId === u.id}
                      className="px-3 py-1 rounded-full text-white text-xs font-medium disabled:opacity-40"
                      style={{ backgroundColor: '#34C759' }}
                    >
                      {addingId === u.id ? '…' : 'Hinzufügen'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {loadingStudents ? (
            <p className="text-[#8E8E93] text-sm">Lade…</p>
          ) : students.length === 0 ? (
            <p className="text-[#8E8E93] text-sm">Keine Schüler in dieser Klasse.</p>
          ) : (
            <div className="space-y-2">
              {students.map(student => (
                <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#2C2C2E' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: '#007AFF' }}>
                    {getInitials(student.name)}
                  </div>
                  <p className="text-white text-sm flex-1">{student.name}</p>
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveStudent(student)}
                      disabled={removingId === student.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-[#3A3A3C] disabled:opacity-40"
                      style={{ color: '#FF3B30' }}
                      title="Entfernen"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assignments */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={15} color="#8E8E93" />
            <h3 className="text-[#8E8E93] text-xs font-semibold uppercase tracking-wide">
              Aufgaben ({classAssignments.length})
            </h3>
          </div>
          {classAssignments.length === 0 ? (
            <p className="text-[#8E8E93] text-sm">Keine Aufgaben für diese Klasse.</p>
          ) : (
            <div className="space-y-2">
              {classAssignments.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#2C2C2E' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#007AFF' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.title}</p>
                    {a.due_date && (
                      <p className="text-[#8E8E93] text-xs">Fällig: {new Date(a.due_date).toLocaleDateString('de-DE')}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full shrink-0"
                    style={{ backgroundColor: '#3A3A3C', color: '#8E8E93' }}>
                    {a.points} Pkt
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
