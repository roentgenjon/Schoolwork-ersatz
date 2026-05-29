import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Paperclip, Link, X, ArrowLeft, Trash2,
  ExternalLink, FileText, CheckCircle2, Upload, Download, RotateCcw,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { api, uploadFile, fileUrl } from '../api/client';
import type { Assignment, Attachment, Submission, SubmissionFile } from '../types';

const TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz', handout: 'Handout', activity: 'Aktivität', book_report: 'Buchbericht', collaboration: 'Kollaboration',
};
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Nicht begonnen', in_progress: 'In Bearbeitung',
  turned_in: 'Eingereicht', returned: 'Zurückgegeben', graded: 'Bewertet',
};
const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600', in_progress: 'bg-yellow-100 text-yellow-700',
  turned_in: 'bg-blue-100 text-blue-700', returned: 'bg-orange-100 text-orange-700', graded: 'bg-green-100 text-green-700',
};

interface AttachmentInput {
  type: 'file' | 'link';
  url: string;
  name: string;
  r2_key?: string;
  mime_type?: string;
}


function FileDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(Array.from(e.dataTransfer.files)); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors select-none
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
    >
      <input ref={inputRef} type="file" multiple className="sr-only"
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <Upload className="w-5 h-5 mx-auto text-gray-400 mb-1" />
      <p className="text-sm text-gray-500">Tippen oder Dateien hierher ziehen</p>
      <p className="text-xs text-gray-400 mt-0.5">Gerät · iCloud · max. 5 MB</p>
    </div>
  );
}

function AttachmentList({ attachments, onDelete }: { attachments: Attachment[]; onDelete?: (id: string) => void }) {
  if (!attachments.length) return null;
  function open(att: Attachment) {
    if (att.type === 'link' && att.url) window.open(att.url, '_blank', 'noopener noreferrer');
    else if (att.r2_key) window.open(fileUrl(att.r2_key), '_blank', 'noopener noreferrer');
  }
  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          {att.type === 'link'
            ? <Link className="w-4 h-4 text-blue-500 shrink-0" />
            : <Paperclip className="w-4 h-4 text-gray-500 shrink-0" />}
          <button onClick={() => open(att)} className="flex-1 text-sm text-blue-600 hover:underline text-left truncate">
            {att.name}
          </button>
          <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
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

function SubmissionFileRow({ file, onDelete }: { file: SubmissionFile; onDelete?: () => void }) {
  const isImage = file.mime_type?.startsWith('image/');
  return (
    <div className="space-y-1">
      {isImage && file.r2_key && (
        <img
          src={fileUrl(file.r2_key)}
          alt={file.name}
          className="rounded-xl max-w-full max-h-48 object-cover cursor-pointer"
          onClick={() => window.open(fileUrl(file.r2_key!), '_blank')}
        />
      )}
      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="flex-1 text-sm truncate">{file.name}</span>
        <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
        {file.r2_key && (
          <a href={fileUrl(file.r2_key)} target="_blank" rel="noopener noreferrer"
            download={file.name} className="text-blue-600 hover:text-blue-700">
            <Download className="w-4 h-4" />
          </a>
        )}
        {onDelete && (
          <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
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
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addLink() {
    if (!linkUrl.trim() || !linkName.trim()) return;
    setAttachments((p) => [...p, { type: 'link', url: linkUrl.trim(), name: linkName.trim() }]);
    setLinkUrl(''); setLinkName('');
  }

  async function addFiles(files: File[]) {
    setLoading(true);
    for (const file of files) {
      if (file.size > 5_000_000) { setError(`${file.name}: max. 5 MB`); continue; }
      try {
        const r2_key = await uploadFile(file);
        setAttachments((p) => [...p, { type: 'file', url: '', name: file.name, r2_key, mime_type: file.type }]);
      } catch (e: any) { setError(e.message || 'Upload fehlgeschlagen'); }
    }
    setLoading(false);
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
      onCreated(); onClose();
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

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Dateien / Links</label>
          {attachments.length > 0 && (
            <div className="space-y-2 mb-3">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  {att.type === 'link' ? <Link className="w-4 h-4 text-blue-500" /> : <Paperclip className="w-4 h-4 text-gray-500" />}
                  <span className="flex-1 text-sm truncate">{att.name}</span>
                  <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}>
                    <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <FileDropZone onFiles={addFiles} />
          <div className="flex gap-2 mt-2">
            <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Link-Name"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" />
            <button type="button" onClick={addLink}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50">
            Abbrechen
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
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
  const [pageError, setPageError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Student submission state
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const contentInitialized = useRef(false);

  // Teacher: add attachment
  const [showAddAtt, setShowAddAtt] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const isTeacher = user?.role === 'admin' || user?.role === 'teacher';

  async function load() {
    if (!id) return;
    try {
      setPageError('');
      const data = await api.get<Assignment & { submissions: Submission[] }>(`/api/assignments/${id}`);
      setAssignment(data);
      setSubmissions(data.submissions || []);
    } catch (e: any) {
      setPageError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const mySubmission = submissions.find((s) => s.student_id === user?.id);

  useEffect(() => {
    if (!contentInitialized.current && mySubmission?.content != null) {
      setContent(mySubmission.content);
      contentInitialized.current = true;
    }
  }, [mySubmission?.id]);

  const canEdit = !mySubmission || mySubmission.status === 'in_progress' || mySubmission.status === 'returned';

  async function handleAddAttachmentLink(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !linkUrl.trim() || !linkName.trim()) return;
    try {
      await api.post(`/api/assignments/${id}/attachments`, { type: 'link', url: linkUrl.trim(), name: linkName.trim() });
      await load();
      setLinkUrl(''); setLinkName(''); setShowAddAtt(false);
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
  }

  async function handleAddAttachmentFiles(files: File[]) {
    if (!id) return;
    for (const file of files) {
      if (file.size > 5_000_000) { setSubmitError(`${file.name}: max. 5 MB`); continue; }
      try {
        const r2_key = await uploadFile(file);
        await api.post(`/api/assignments/${id}/attachments`, { type: 'file', name: file.name, mime_type: file.type, r2_key });
      } catch (e: any) { setSubmitError(e.message || 'Fehler beim Upload'); }
    }
    await load();
  }

  async function handleDeleteAttachment(attId: string) {
    if (!id) return;
    try {
      await api.delete(`/api/assignments/${id}/attachments/${attId}`);
      setAssignment((a) => a ? { ...a, attachments: a.attachments?.filter((att) => att.id !== attId) } : a);
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
  }

  async function handleDelete() {
    if (!id || !confirm('Aufgabe löschen?')) return;
    try {
      await api.delete(`/api/assignments/${id}`);
      navigate('/assignments');
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
  }

  async function handleSubmit(status: string) {
    setSubmitLoading(true);
    setSubmitError('');
    try {
      let submissionId: string;
      if (mySubmission) {
        await api.put(`/api/submissions/${mySubmission.id}`, { status, content: content || undefined });
        submissionId = mySubmission.id;
      } else {
        const res = await api.post<{ id: string }>('/api/submissions', {
          assignment_id: id, status, content: content || undefined,
        });
        submissionId = res.id;
      }
      for (const file of pendingFiles) {
        if (file.size > 5_000_000) { setSubmitError(`${file.name}: max. 5 MB`); return; }
        const r2_key = await uploadFile(file);
        await api.post(`/api/submissions/${submissionId}/files`, {
          name: file.name, mime_type: file.type || 'application/octet-stream', size: file.size, r2_key,
        });
      }
      setPendingFiles([]);
      await load();
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
    finally { setSubmitLoading(false); }
  }

  async function handleDeleteSubmissionFile(fileId: string) {
    try {
      await api.delete(`/api/submission-files/${fileId}`);
      await load();
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
  }

  async function handleGrade(subId: string, score: number, feedback: string) {
    try {
      await api.put(`/api/submissions/${subId}`, { status: 'graded', score, feedback });
      await load();
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
  }

  async function handleReturn(subId: string) {
    try {
      await api.put(`/api/submissions/${subId}`, { status: 'returned' });
      await load();
    } catch (e: any) { setSubmitError(e.message || 'Fehler'); }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Laden…</div>;
  if (pageError) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
      <p className="text-red-500">{pageError}</p>
      <button onClick={load} className="text-sm text-blue-600 hover:underline">Erneut versuchen</button>
    </div>
  );
  if (!assignment) return <div className="flex-1 flex items-center justify-center text-gray-400">Nicht gefunden</div>;

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

        {/* Assignment info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{assignment.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {assignment.class_name} · {TYPE_LABELS[assignment.type]} · {assignment.points} Pkt.
              </p>
            </div>
            {assignment.due_date && (
              <div className="text-sm text-gray-500 shrink-0">
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
            <div className="space-y-2">
              <FileDropZone onFiles={handleAddAttachmentFiles} />
              <form onSubmit={handleAddAttachmentLink} className="flex gap-2">
                <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Link-Name"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">OK</button>
              </form>
            </div>
          )}
          {(!assignment.attachments?.length && !showAddAtt) && (
            <p className="text-sm text-gray-400">Keine Anhänge</p>
          )}
          <AttachmentList
            attachments={assignment.attachments || []}
            onDelete={isTeacher ? handleDeleteAttachment : undefined}
          />
        </div>

        {submitError && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{submitError}</div>
        )}

        {/* Student: submission */}
        {user?.role === 'student' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Meine Abgabe</h3>
              {mySubmission && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[mySubmission.status]}`}>
                  {STATUS_LABELS[mySubmission.status]}
                </span>
              )}
            </div>

            {/* Returned feedback */}
            {mySubmission?.status === 'returned' && mySubmission.feedback && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-sm text-orange-800">
                <strong>Rückmeldung:</strong> {mySubmission.feedback}
              </div>
            )}

            {/* Grade + graded feedback */}
            {mySubmission?.score != null && (
              <p className="text-sm text-gray-700">
                Bewertung: <strong className="text-green-700">{mySubmission.score} / {assignment.points} Pkt.</strong>
              </p>
            )}
            {mySubmission?.status === 'graded' && mySubmission.feedback && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm text-green-800">
                {mySubmission.feedback}
              </div>
            )}

            {canEdit ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Antwort eingeben…"
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Existing saved files */}
                {mySubmission?.files?.map((f) => (
                  <SubmissionFileRow key={f.id} file={f} onDelete={() => handleDeleteSubmissionFile(f.id)} />
                ))}

                {/* Pending new files */}
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="flex-1 text-sm truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                      className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <FileDropZone onFiles={(files) => setPendingFiles((p) => [...p, ...files])} />

                <div className="flex gap-2">
                  <button onClick={() => handleSubmit('in_progress')} disabled={submitLoading}
                    className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                    {submitLoading ? '…' : 'In Bearbeitung'}
                  </button>
                  <button onClick={() => handleSubmit('turned_in')} disabled={submitLoading}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {submitLoading ? 'Einreichen…' : 'Einreichen'}
                  </button>
                </div>
              </>
            ) : (
              // Read-only: turned_in or graded
              <div className="space-y-2">
                {mySubmission?.content && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {mySubmission.content}
                  </div>
                )}
                {mySubmission?.files?.map((f) => (
                  <SubmissionFileRow key={f.id} file={f} />
                ))}
                {!mySubmission?.content && !mySubmission?.files?.length && (
                  <p className="text-sm text-gray-400">Keine Inhalte eingereicht</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Teacher: all submissions */}
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
                  <GradeRow key={sub.id} sub={sub} maxPoints={assignment.points} onGrade={handleGrade} onReturn={handleReturn} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GradeRow({
  sub, maxPoints, onGrade, onReturn,
}: {
  sub: Submission; maxPoints: number;
  onGrade: (id: string, score: number, feedback: string) => void;
  onReturn: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(sub.score ?? 0);
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const hasContent = !!(sub.content || sub.files?.length);

  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-gray-900 text-sm truncate">{sub.student_name}</span>
          <span className={`shrink-0 inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status]}`}>
            {STATUS_LABELS[sub.status]}
          </span>
          {sub.score != null && (
            <span className="text-xs text-green-600 font-semibold shrink-0">{sub.score}/{maxPoints}</span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {hasContent && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-500 hover:text-gray-700 underline">
              {expanded ? 'Schließen' : 'Ansehen'}
            </button>
          )}
          <button
            onClick={() => { setEditing(!editing); if (!editing) setExpanded(true); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {editing ? 'Abbrechen' : 'Bewerten'}
          </button>
        </div>
      </div>

      {expanded && hasContent && (
        <div className="space-y-2">
          {sub.content && (
            <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {sub.content}
            </div>
          )}
          {sub.files?.map((f) => (
            <SubmissionFileRow key={f.id} file={f} />
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <div className="flex gap-2 items-center">
            <input type="number" value={score} onChange={(e) => setScore(+e.target.value)} min={0} max={maxPoints}
              className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-sm text-gray-500">/ {maxPoints} Pkt.</span>
          </div>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (optional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onGrade(sub.id, score, feedback); setEditing(false); }}
              className="flex-1 bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-green-700"
            >
              Bewerten
            </button>
            <button
              onClick={() => { onReturn(sub.id); setEditing(false); setExpanded(false); }}
              className="px-4 py-2.5 border border-orange-300 text-orange-600 text-sm font-medium rounded-xl hover:bg-orange-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Zurückgeben
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
