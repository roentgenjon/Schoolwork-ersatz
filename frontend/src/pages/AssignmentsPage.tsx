import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Paperclip, Link, X, ArrowLeft, Trash2, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import type { Assignment, Class, Attachment, Submission } from '../types';

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz', handout: 'Handout', activity: 'Aktivität', book_report: 'Buchbericht', collaboration: 'Kollaboration',
};
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Nicht begonnen', in_progress: 'In Bearbeitung', turned_in: 'Eingereicht', returned: 'Zurückgegeben', graded: 'Bewertet',
};
const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600', in_progress: 'bg-yellow-100 text-yellow-700',
  turned_in: 'bg-blue-100 text-blue-700', returned: 'bg-orange-100 text-orange-700', graded: 'bg-green-100 text-green-700',
};

interface AttachmentInput {
  type: 'file' | 'link';
  url: string;
  name: string;
}

function AttachmentList({ attachments, onDelete }: { attachments: Attachment[]; onDelete?: (id: string) => void }) {
  if (!attachments.length) return null;
  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          {att.type === 'link' ? <Link className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />}
          <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">
            {att.name}
          </a>
          <ExternalLink className="w-3 h-3 text-gray-400" />
          {onDelete && (
            <button onClick={() => onDelete(att.id)} className="text-gray-400 hover:text-red-500 ml-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function CreateAssignmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { classes } = useAppStore();
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [type, setType] = useState('activity');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [attType, setAttType] = useState<'file' | 'link'>('link');
  const [attUrl, setAttUrl] = useState('');
  const [attName, setAttName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addAttachment() {
    if (!attUrl.trim() || !attName.trim()) return;
    setAttachments((prev) => [...prev, { type: attType, url: attUrl.trim(), name: attName.trim() }]);
    setAttUrl(''); setAttName('');
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !classId) { setError('Titel und Klasse erforderlich'); return; }
    setLoading(true);
    try {
      await api.post('/api/assignments', {
        title, class_id: classId, type, description: description || undefined,
        points, due_date: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : undefined,
        attachments: attachments.length ? attachments : undefined,
      });
      onCreated();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <form onSubmit={submit} className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Neue Aufgabe</h2>

        <div>
          <label className="text-sm font-medium text-gray-700">Titel</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Klasse</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Wählen…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Typ</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Beschreibung (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Punkte</label>
            <input type="number" value={points} onChange={(e) => setPoints(+e.target.value)} min={0}
              className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Fällig am</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Dateien / Links</label>
          <div className="space-y-2 mb-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                {att.type === 'link' ? <Link className="w-4 h-4 text-blue-500" /> : <Paperclip className="w-4 h-4 text-gray-500" />}
                <span className="flex-1 text-sm truncate">{att.name}</span>
                <button type="button" onClick={() => removeAttachment(i)}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={attType} onChange={(e) => setAttType(e.target.value as 'file' | 'link')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="link">Link</option>
              <option value="file">Datei-URL</option>
            </select>
            <input value={attName} onChange={(e) => setAttName(e.target.value)} placeholder="Name"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" />
            <input value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="URL / Link"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" />
            <button type="button" onClick={addAttachment} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
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

export default function AssignmentsPage() {
  const { assignments, fetchAssignments } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.role === 'admin' || user?.role === 'teacher';

  useEffect(() => { fetchAssignments(); }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Aufgaben"
        actions={canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Neu
          </button>
        )}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        {assignments.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg font-medium">Keine Aufgaben</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <button key={a.id} onClick={() => navigate(`/assignments/${a.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{a.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{a.class_name} · {TYPE_LABELS[a.type]}</p>
                    {a.attachments && a.attachments.length > 0 && (
                      <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> {a.attachments.length} Anhang/Anhänge
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {a.due_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(a.due_date * 1000).toLocaleDateString('de-DE')}
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-600">{a.points} Pkt.</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {showCreate && <CreateAssignmentModal onClose={() => setShowCreate(false)} onCreated={fetchAssignments} />}
    </div>
  );
}

export function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [attUrl, setAttUrl] = useState('');
  const [attName, setAttName] = useState('');
  const [attType, setAttType] = useState<'link' | 'file'>('link');
  const [showAddAtt, setShowAddAtt] = useState(false);

  const isTeacher = user?.role === 'admin' || user?.role === 'teacher';

  async function load() {
    if (!id) return;
    const data = await api.get<Assignment & { submissions: Submission[] }>(`/api/assignments/${id}`);
    setAssignment(data);
    setSubmissions(data.submissions || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !attUrl.trim() || !attName.trim()) return;
    await api.post(`/api/assignments/${id}/attachments`, { type: attType, url: attUrl.trim(), name: attName.trim() });
    await load();
    setAttUrl(''); setAttName(''); setShowAddAtt(false);
  }

  async function handleDeleteAttachment(attId: string) {
    if (!id) return;
    await api.delete(`/api/assignments/${id}/attachments/${attId}`);
    setAssignment((a) => a ? { ...a, attachments: a.attachments?.filter((att) => att.id !== attId) } : a);
  }

  async function handleDelete() {
    if (!id || !confirm('Aufgabe löschen?')) return;
    await api.delete(`/api/assignments/${id}`);
    navigate('/assignments');
  }

  async function handleSubmit(status: string) {
    const existing = submissions.find((s) => s.student_id === user?.id);
    if (existing) {
      await api.put(`/api/submissions/${existing.id}`, { status });
    } else {
      await api.post('/api/submissions', { assignment_id: id, status });
    }
    await load();
  }

  async function handleGrade(subId: string, score: number, feedback: string) {
    await api.put(`/api/submissions/${subId}`, { status: 'graded', score, feedback });
    await load();
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Laden…</div>;
  if (!assignment) return <div className="flex-1 flex items-center justify-center text-gray-400">Nicht gefunden</div>;

  const mySubmission = submissions.find((s) => s.student_id === user?.id);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title={assignment.title}
        actions={isTeacher && (
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 pb-20 md:pb-6">
        <button onClick={() => navigate('/assignments')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{assignment.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{assignment.class_name} · {TYPE_LABELS[assignment.type]} · {assignment.points} Pkt.</p>
            </div>
            {assignment.due_date && (
              <div className="text-sm text-gray-500 flex-shrink-0">
                Fällig: {new Date(assignment.due_date * 1000).toLocaleDateString('de-DE')}
              </div>
            )}
          </div>
          {assignment.description && (
            <p className="text-gray-700 text-sm leading-relaxed">{assignment.description}</p>
          )}
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Anhänge</h3>
            {isTeacher && (
              <button onClick={() => setShowAddAtt(!showAddAtt)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Hinzufügen
              </button>
            )}
          </div>
          {showAddAtt && isTeacher && (
            <form onSubmit={handleAddAttachment} className="flex gap-2 flex-wrap">
              <select value={attType} onChange={(e) => setAttType(e.target.value as 'link' | 'file')}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="link">Link</option>
                <option value="file">Datei</option>
              </select>
              <input value={attName} onChange={(e) => setAttName(e.target.value)} placeholder="Name"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-0" />
              <input value={attUrl} onChange={(e) => setAttUrl(e.target.value)} placeholder="URL"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-0" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">OK</button>
            </form>
          )}
          {assignment.attachments?.length === 0 && !showAddAtt && (
            <p className="text-sm text-gray-400">Keine Anhänge</p>
          )}
          <AttachmentList
            attachments={assignment.attachments || []}
            onDelete={isTeacher ? handleDeleteAttachment : undefined}
          />
        </div>

        {/* Student: submit button */}
        {user?.role === 'student' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900">Meine Einreichung</h3>
            {mySubmission ? (
              <div className="space-y-2">
                <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[mySubmission.status]}`}>
                  {STATUS_LABELS[mySubmission.status]}
                </span>
                {mySubmission.score !== null && (
                  <p className="text-sm text-gray-700">Note: <strong>{mySubmission.score}/{assignment.points}</strong></p>
                )}
                {mySubmission.feedback && (
                  <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl">{mySubmission.feedback}</p>
                )}
                {mySubmission.status === 'not_started' || mySubmission.status === 'in_progress' ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleSubmit('in_progress')}
                      className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                      In Bearbeitung
                    </button>
                    <button onClick={() => handleSubmit('turned_in')}
                      className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Einreichen
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleSubmit('in_progress')}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  In Bearbeitung
                </button>
                <button onClick={() => handleSubmit('turned_in')}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Einreichen
                </button>
              </div>
            )}
          </div>
        )}

        {/* Teacher: submissions list */}
        {isTeacher && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Einreichungen ({submissions.length})</h3>
            </div>
            {submissions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Noch keine Einreichungen</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {submissions.map((sub) => (
                  <GradeRow key={sub.id} sub={sub} maxPoints={assignment.points} onGrade={handleGrade} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GradeRow({ sub, maxPoints, onGrade }: { sub: Submission; maxPoints: number; onGrade: (id: string, score: number, feedback: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(sub.score ?? 0);
  const [feedback, setFeedback] = useState(sub.feedback ?? '');

  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-900 text-sm">{sub.student_name}</span>
          <span className={`ml-2 inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status]}`}>
            {STATUS_LABELS[sub.status]}
          </span>
        </div>
        <button onClick={() => setEditing(!editing)} className="text-xs text-blue-600 hover:text-blue-700">
          {editing ? 'Schließen' : 'Bewerten'}
        </button>
      </div>
      {editing && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2 items-center">
            <input type="number" value={score} onChange={(e) => setScore(+e.target.value)} min={0} max={maxPoints}
              className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <span className="text-sm text-gray-500">/ {maxPoints} Pkt.</span>
          </div>
          <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback (optional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <button onClick={() => { onGrade(sub.id, score, feedback); setEditing(false); }}
            className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-700">
            Speichern
          </button>
        </div>
      )}
    </div>
  );
}
