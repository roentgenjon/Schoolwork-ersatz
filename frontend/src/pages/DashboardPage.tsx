import { useEffect } from 'react'
import {
  BookOpen,
  ClipboardList,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { useClassStore } from '../store/classStore'
import { useAssignmentStore } from '../store/assignmentStore'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ backgroundColor: '#1C1C1E' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-[#8E8E93] text-sm">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isTeacher, isStudent, isAdmin } = useAuth()
  const { classes, fetchClasses } = useClassStore()
  const { assignments, fetchAssignments } = useAssignmentStore()

  useEffect(() => {
    fetchClasses()
    fetchAssignments()
  }, [fetchClasses, fetchAssignments])

  const now = Date.now()
  const upcomingAssignments = assignments.filter(
    (a) => a.due_date && a.due_date > now
  )
  const overdueAssignments = assignments.filter(
    (a) => a.due_date && a.due_date < now
  )

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Guten Morgen'
    if (hour < 18) return 'Guten Tag'
    return 'Guten Abend'
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Header title="Dashboard" />
        <div className="flex-1 ios-scroll px-6 py-4">
          {/* Greeting */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">
              {greeting()}, {user?.name?.split(' ')[0]}!
            </h2>
            <p className="text-[#8E8E93] mt-1">
              {new Date().toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Teacher Dashboard */}
          {isTeacher && (
            <div className="space-y-6">
              <section>
                <h3 className="text-white font-semibold mb-3">Übersicht</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <StatCard
                    icon={<BookOpen size={22} />}
                    label="Klassen"
                    value={classes.length}
                    color="#007AFF"
                  />
                  <StatCard
                    icon={<ClipboardList size={22} />}
                    label="Aufgaben"
                    value={assignments.length}
                    color="#34C759"
                  />
                  <StatCard
                    icon={<Clock size={22} />}
                    label="Bald fällig"
                    value={upcomingAssignments.length}
                    color="#FF9F0A"
                  />
                </div>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-3">Aktuelle Aufgaben</h3>
                {assignments.length === 0 ? (
                  <div
                    className="p-6 rounded-xl text-center"
                    style={{ backgroundColor: '#1C1C1E' }}
                  >
                    <p className="text-[#8E8E93]">Keine Aufgaben vorhanden.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ backgroundColor: '#1C1C1E' }}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: '#007AFF' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {assignment.title}
                          </p>
                          {assignment.due_date && (
                            <p className="text-[#8E8E93] text-xs">
                              Fällig:{' '}
                              {new Date(assignment.due_date).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: '#2C2C2E', color: '#8E8E93' }}
                        >
                          {assignment.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Student Dashboard */}
          {isStudent && (
            <div className="space-y-6">
              <section>
                <h3 className="text-white font-semibold mb-3">Meine Aufgaben</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<Clock size={22} />}
                    label="Bald fällig"
                    value={upcomingAssignments.length}
                    color="#FF9F0A"
                  />
                  <StatCard
                    icon={<CheckCircle size={22} />}
                    label="Überfällig"
                    value={overdueAssignments.length}
                    color="#FF3B30"
                  />
                </div>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-3">Meine Klassen</h3>
                {classes.length === 0 ? (
                  <div
                    className="p-6 rounded-xl text-center"
                    style={{ backgroundColor: '#1C1C1E' }}
                  >
                    <p className="text-[#8E8E93]">Du bist noch in keiner Klasse.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: '#1C1C1E' }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                          style={{ backgroundColor: `${cls.color}30` }}
                        >
                          {cls.icon}
                        </div>
                        <p className="text-white font-medium text-sm">{cls.name}</p>
                        <p className="text-[#8E8E93] text-xs mt-1">{cls.subject}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-white font-semibold mb-3">Bald fällige Aufgaben</h3>
                {upcomingAssignments.length === 0 ? (
                  <div
                    className="p-6 rounded-xl text-center"
                    style={{ backgroundColor: '#1C1C1E' }}
                  >
                    <p className="text-[#8E8E93]">Keine ausstehenden Aufgaben.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAssignments.slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ backgroundColor: '#1C1C1E' }}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: '#FF9F0A' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {assignment.title}
                          </p>
                          {assignment.due_date && (
                            <p className="text-[#8E8E93] text-xs">
                              Fällig:{' '}
                              {new Date(assignment.due_date).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Admin Dashboard */}
          {isAdmin && (
            <div className="space-y-6">
              <section>
                <h3 className="text-white font-semibold mb-3">Schulstatistiken</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <StatCard
                    icon={<BookOpen size={22} />}
                    label="Klassen"
                    value={classes.length}
                    color="#007AFF"
                  />
                  <StatCard
                    icon={<ClipboardList size={22} />}
                    label="Aufgaben"
                    value={assignments.length}
                    color="#34C759"
                  />
                  <StatCard
                    icon={<TrendingUp size={22} />}
                    label="Aktiv"
                    value={upcomingAssignments.length}
                    color="#FF9F0A"
                  />
                  <StatCard
                    icon={<Users size={22} />}
                    label="Schüler"
                    value={classes.reduce((sum, c) => sum + (c.student_count ?? 0), 0)}
                    color="#BF5AF2"
                  />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
