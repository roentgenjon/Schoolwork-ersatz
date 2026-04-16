import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useClassStore } from '../store/classStore'
import { useAssignmentStore } from '../store/assignmentStore'
import { client } from '../api/client'
import type { StudentProgress } from '../types'

export default function ProgressPage() {
  const { classes, fetchClasses } = useClassStore()
  const { fetchAssignments } = useAssignmentStore()
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchClasses()
    fetchAssignments()
  }, [fetchClasses, fetchAssignments])

  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]!.id)
    }
  }, [classes, selectedClassId])

  useEffect(() => {
    if (!selectedClassId) return
    setLoading(true)
    client
      .get<StudentProgress[]>(`/classes/${selectedClassId}/progress`)
      .then(setProgress)
      .catch(() => setProgress([]))
      .finally(() => setLoading(false))
  }, [selectedClassId])

  const chartData = progress.map((p) => ({
    name: p.student.name.split(' ')[0] ?? p.student.name,
    score: Math.round(p.averageScore * 10) / 10,
    completed: p.completedCount,
  }))

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <Header title="Fortschritt" />
        <div className="flex-1 ios-scroll px-6 py-4">
          {/* Class selector */}
          <div className="mb-6">
            <label className="text-[#8E8E93] text-sm font-medium uppercase tracking-wide block mb-2">
              Klasse
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-4 py-3 rounded-xl text-white min-h-[44px] w-full md:w-auto min-w-[240px]"
              style={{ backgroundColor: '#1C1C1E', border: '1px solid #38383A', colorScheme: 'dark' }}
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id} style={{ backgroundColor: '#1C1C1E' }}>
                  {cls.name} — {cls.subject}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Lade Fortschrittsdaten...</p>
            </div>
          ) : progress.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[#8E8E93]">Keine Daten für diese Klasse.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Bar chart */}
              <section>
                <h3 className="text-white font-semibold mb-4">Durchschnittsnoten</h3>
                <div
                  className="p-4 rounded-2xl"
                  style={{ backgroundColor: '#1C1C1E' }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#38383A" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#8E8E93', fontSize: 12 }}
                        axisLine={{ stroke: '#38383A' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: '#8E8E93', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2C2C2E',
                          border: '1px solid #38383A',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#8E8E93' }}
                        cursor={{ fill: 'rgba(0,122,255,0.1)' }}
                      />
                      <Bar
                        dataKey="score"
                        fill="#007AFF"
                        radius={[6, 6, 0, 0]}
                        name="Ø Note"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Progress table */}
              <section>
                <h3 className="text-white font-semibold mb-4">Schülerübersicht</h3>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: '#1C1C1E' }}
                >
                  {/* Table header */}
                  <div
                    className="grid grid-cols-4 px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#8E8E93]"
                    style={{ borderBottom: '1px solid #38383A' }}
                  >
                    <span className="col-span-2">Schüler</span>
                    <span className="text-center">Abgaben</span>
                    <span className="text-right">Ø Note</span>
                  </div>

                  {/* Table rows */}
                  {progress.map((p, i) => {
                    const totalSubs = p.submissions.length
                    const completedPct = totalSubs > 0
                      ? (p.completedCount / totalSubs) * 100
                      : 0
                    const initials = p.student.name
                      .split(' ')
                      .map((x) => x[0] ?? '')
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <div
                        key={p.student.id}
                        className="grid grid-cols-4 items-center px-4 py-3 gap-2"
                        style={{
                          borderBottom: i < progress.length - 1 ? '1px solid #38383A' : 'none',
                        }}
                      >
                        {/* Name + progress bar */}
                        <div className="col-span-2 flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                            style={{ backgroundColor: '#007AFF' }}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {p.student.name}
                            </p>
                            <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#2C2C2E' }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${completedPct}%`,
                                  backgroundColor: '#34C759',
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Completed */}
                        <p className="text-[#8E8E93] text-sm text-center">
                          {p.completedCount}/{totalSubs}
                        </p>

                        {/* Average score */}
                        <p
                          className="text-sm font-semibold text-right"
                          style={{
                            color:
                              p.averageScore >= 80
                                ? '#34C759'
                                : p.averageScore >= 60
                                ? '#FF9F0A'
                                : '#FF3B30',
                          }}
                        >
                          {totalSubs > 0 ? `${Math.round(p.averageScore)}%` : '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
