import { useEffect, useState } from 'react';
import { Plus, Trash2, ExternalLink, FileText } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import type { Class } from '../types';

function CreateHandoutModal({ onClose, onCreated, classes }: { onClose: () => void; onCreated: () => void; classes: Class[] }) {
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !classId) { setError('Titel und Klasse erforderlich'); return; }
    setLoading(true);
    try {
      await api.post('/api/handouts', {
        title, class_id: classId, description: description || undefined,
        file_url: fileUrl || undefined, file_type: fileType || undefined,
      });
      onCreated();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <form onSubmit={submit} className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Neues Material</h2>
        <div>
          <label className="text-sm font-medium text-gray-700">Titel</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Klasse</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Wählen…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Beschreibung (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Datei-URL (optional)</label>
          <input type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50">Abbrechen</button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HandoutsPage() {
  const { handouts, classes, fetchHandouts, fetchClasses } = useAppStore();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.role === 'admin' || user?.role === 'teacher';

  useEffect(() => { fetchHandouts(); fetchClasses(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Material löschen?')) return;
    await api.delete(`/api/handouts/${id}`);
    fetchHandouts();
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Materialien"
        actions={canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Neu
          </button>
        )}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        {handouts.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg font-medium">Keine Materialien</p>
          </div>
        ) : (
          <div className="space-y-3">
            {handouts.map((h) => (
              <div key={h.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{h.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{h.class_name}</p>
                    {h.description && <p className="text-sm text-gray-600 mt-1">{h.description}</p>}
                    {h.file_url && (
                      <a href={h.file_url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Öffnen
                      </a>
                    )}
                  </div>
                  {canCreate && (
                    <button onClick={() => handleDelete(h.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showCreate && <CreateHandoutModal onClose={() => setShowCreate(false)} onCreated={fetchHandouts} classes={classes} />}
    </div>
  );
}
