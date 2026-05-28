import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { api } from '../api/client';

interface ProgressData {
  student: { id: string; name: string };
  stats: {
    total_assignments: number;
    submitted: number;
    completion_rate: number;
    earned_points: number;
    total_points: number;
    grade_percent: number | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-200',
  in_progress: 'bg-yellow-400',
  turned_in: 'bg-blue-400',
  returned: 'bg-orange-400',
  graded: 'bg-green-500',
};

export default function ProgressPage() {
  const { classes, fetchClasses } = useAppStore();
  const [selectedClass, setSelectedClass] = useState('');
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchClasses(); }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    api.get<ProgressData[]>(`/api/progress/${selectedClass}`)
      .then(setProgress)
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const chartData = progress.map((p) => ({
    name: p.student.name.split(' ')[0],
    'Abgabequote': p.stats.completion_rate,
    'Note (%)': p.stats.grade_percent ?? 0,
  }));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Fortschritt" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pb-20 md:pb-6">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Klasse auswählen</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Klasse wählen…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading && <div className="text-center text-gray-400 py-8">Laden…</div>}

        {!loading && progress.length > 0 && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Übersicht</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="Abgabequote" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Note (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {progress.map((p) => (
                <div key={p.student.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{p.student.name}</h4>
                    <div className="text-sm text-gray-500">
                      {p.stats.submitted}/{p.stats.total_assignments} abgegeben
                      {p.stats.grade_percent !== null && ` · ${p.stats.grade_percent}%`}
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${p.stats.completion_rate}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{p.stats.completion_rate}% Abgabequote</div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && selectedClass && progress.length === 0 && (
          <div className="text-center text-gray-400 py-8">Keine Daten</div>
        )}
      </div>
    </div>
  );
}
