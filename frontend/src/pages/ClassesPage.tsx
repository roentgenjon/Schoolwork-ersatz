import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2, UserPlus, UserMinus, RefreshCw, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import type { Class, User } from '../types';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D55', '#5AC8FA'];
const ICONS = ['📚', '🔬', '🎨', '🏃', '🎵', '📝', '🌍', '🧮', '🏛️'];

function ClassCard({ cls, onClick }: { cls: Class; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: cls.color + '20' }}
        >
          {cls.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{cls.name}</h3>
          {cls.subject && <p className="text-sm text-gray-500 mt-0.5">{cls.subject}</p>}
          {cls.teacher_name && <p className="text-xs text-gray-400 mt-1">Lehrer: {cls.teacher_name}</p>}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function CreateClassModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name erforderlich'); return; }
    setLoading(true);
    try {
      await api.post('/api/classes', { name, subject: subject || undefined, color, icon });
      onCreated();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <form onSubmit={submit} className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Neue Klasse</h2>
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Klasse 7a" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Fach (optional)</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mathematik" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Farbe</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-4 transition-all ${color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Icon</label>
          <div className="flex gap-2 flex-wrap">
            {ICONS.map((ic) => (
              <button key={ic} type="button" onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${icon === ic ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50">Abbrechen</button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Erstellen…' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ClassesPage() {
  const { classes, fetchClasses } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.role === 'admin' || user?.role === 'teacher';

  useEffect(() => { fetchClasses(); }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Klassen"
        actions={canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Neu
          </button>
        )}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        {classes.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-lg font-medium">Keine Klassen</p>
            {canCreate && <p className="text-sm mt-1">Erstelle deine erste Klasse</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classes.map((cls) => (
              <ClassCard key={cls.id} cls={cls} onClick={() => navigate(`/classes/${cls.id}`)} />
            ))}
          </div>
        )}
      </div>
      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} onCreated={fetchClasses} />}
    </div>
  );
}

export function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [cls, setCls] = useState<(Class & { students: User[] }) | null>(null);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addStudentId, setAddStudentId] = useState('');

  const canManage = user?.role === 'admin' || user?.role === 'teacher';

  useEffect(() => {
    if (!id) return;
    api.get<Class & { students: User[] }>(`/api/classes/${id}`)
      .then(setCls)
      .finally(() => setLoading(false));
    if (canManage) {
      api.get<User[]>('/api/users')
        .then((users) => setAllStudents(users.filter((u) => u.role === 'student')));
    }
  }, [id]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!addStudentId || !id) return;
    await api.post(`/api/classes/${id}/students`, { student_id: addStudentId });
    const updated = await api.get<Class & { students: User[] }>(`/api/classes/${id}`);
    setCls(updated);
    setAddStudentId('');
  }

  async function handleRemoveStudent(studentId: string) {
    if (!id) return;
    await api.delete(`/api/classes/${id}/students/${studentId}`);
    setCls((c) => c ? { ...c, students: c.students.filter((s) => s.id !== studentId) } : c);
  }

  async function handleDelete() {
    if (!id || !confirm('Klasse wirklich löschen?')) return;
    await api.delete(`/api/classes/${id}`);
    navigate('/classes');
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Laden…</div>;
  if (!cls) return <div className="flex-1 flex items-center justify-center text-gray-400">Nicht gefunden</div>;

  const enrolled = new Set(cls.students.map((s) => s.id));
  const available = allStudents.filter((s) => !enrolled.has(s.id));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title={cls.name}
        actions={
          canManage && (
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          )
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <button onClick={() => navigate('/classes')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl text-3xl flex items-center justify-center" style={{ backgroundColor: cls.color + '20' }}>
            {cls.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cls.name}</h2>
            {cls.subject && <p className="text-gray-500">{cls.subject}</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Schüler ({cls.students.length})</h3>
          </div>
          {canManage && available.length > 0 && (
            <form onSubmit={handleAddStudent} className="px-4 py-3 border-b border-gray-100 flex gap-2">
              <select
                value={addStudentId}
                onChange={(e) => setAddStudentId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Schüler hinzufügen…</option>
                {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="submit" disabled={!addStudentId}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
                <UserPlus className="w-4 h-4" />
              </button>
            </form>
          )}
          <div className="divide-y divide-gray-100">
            {cls.students.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Keine Schüler eingetragen</p>
            ) : cls.students.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                  {s.name.charAt(0)}
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900">{s.name}</span>
                {canManage && (
                  <button onClick={() => handleRemoveStudent(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
