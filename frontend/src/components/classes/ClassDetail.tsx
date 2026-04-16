import { useEffect, useState } from 'react'
import { X, Users, ClipboardList, Trash2 } from 'lucide-react'
import { client } from '../../api/client'
import { useAssignmentStore } from '../../store/assignmentStore'
import { useAuth } from '../../hooks/useAuth'
import type { Class, User } from '../../types'

interface ClassDetailProps {
  cls: Class
  onClose: () => void
  onDelete: (id: string) => void
}

export default function ClassDetail({ cls, onClose, onDelete }: ClassDetailProps) {
  const [students, setStudents] = useState<User[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const { assignments } = useAssignmentStore()
  const { isTeacher, isAdmin } = useAuth()

  const classAssignments = assignments.filter((a) => a.class_id === cls.id)

  useEffect(() => {
    setLoadingStudents(true)
    client
      .get<User[]>(`/classes/${cls.id}/students`)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false))
  }, [cls.id])

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((p) => p[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid #38383A' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: `${cls.color}30` }}
          >
            {cls.icon}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">{cls.name}</h2>
            <p className="text-[#8E8E93] text-sm">{cls.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isTeacher || isAdmin) && (
            <button
              onClick={() => onDelete(cls.id)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#FF3B30] hover:bg-[#2C2C2E] transition-all duration-200"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#2C2C2E] transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 ios-scroll px-6 py-4 space-y-6">
        {/* Students section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} color="#8E8E93" />
            <h3 className="text-[#8E8E93] text-sm font-medium uppercase tracking-wide">
              Schüler ({students.length})
            </h3>
          </div>
          {loadingStudents ? (
            <p className="text-[#8E8E93] text-sm">Lade...</p>
          ) : students.length === 0 ? (
            <p className="text-[#8E8E93] text-sm">Keine Schüler in dieser Klasse.</p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: '#007AFF' }}
                  >
                    {getInitials(student.name)}
                  </div>
                  <p className="text-white text-sm">{student.name}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assignments section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} color="#8E8E93" />
            <h3 className="text-[#8E8E93] text-sm font-medium uppercase tracking-wide">
              Aufgaben ({classAssignments.length})
            </h3>
          </div>
          {classAssignments.length === 0 ? (
            <p className="text-[#8E8E93] text-sm">Keine Aufgaben für diese Klasse.</p>
          ) : (
            <div className="space-y-2">
              {classAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#2C2C2E' }}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: '#007AFF' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{assignment.title}</p>
                    {assignment.due_date && (
                      <p className="text-[#8E8E93] text-xs">
                        Fällig: {new Date(assignment.due_date).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full shrink-0"
                    style={{ backgroundColor: '#3A3A3C', color: '#8E8E93' }}
                  >
                    {assignment.points} Pkt
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
