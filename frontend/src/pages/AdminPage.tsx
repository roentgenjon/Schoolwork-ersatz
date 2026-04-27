import { useEffect, useState } from 'react';
import { Shield, Trash2, LogOut as ForceLogoutIcon, Settings2, RefreshCw, MessageSquareX } from 'lucide-react';
import Header from '../components/layout/Header';
import PermissionsEditor from '../components/admin/PermissionsEditor';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import type { User } from '../types';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', teacher: 'Lehrer', student: 'Schüler' };
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-green-100 text-green-700',
  student: 'bg-blue-100 text-blue-700',
};

export default function AdminPage() {
  const { users, fetchUsers } = useAppStore();
  const { user: currentUser } = useAuthStore();
  const [editingPerms, setEditingPerms] = useState<User | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [deletingChats, setDeletingChats] = useState(false);

  async function handleDeleteAllChats() {
    if (!confirm('Wirklich ALLE Nachrichten und alle DM/Gruppen-Räume löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    setDeletingChats(true);
    try {
      await api.delete('/api/chat/all');
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingChats(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleForceLogout(u: User) {
    if (!confirm(`${u.name} ausloggen?`)) return;
    setLoading((l) => ({ ...l, [u.id]: true }));
    try {
      await api.post(`/api/users/${u.id}/logout`);
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading((l) => ({ ...l, [u.id]: false })); }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Konto von ${u.name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    setLoading((l) => ({ ...l, [u.id]: true }));
    try {
      await api.delete(`/api/users/${u.id}`);
      await fetchUsers();
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setLoading((l) => ({ ...l, [u.id]: false })); }
  }

  function handlePermsSaved(updated: User) {
    useAppStore.setState((s) => ({
      users: s.users.map((u) => u.id === updated.id ? updated : u),
    }));
    setEditingPerms(null);
  }

  const admins = users.filter((u) => u.role === 'admin');
  const teachers = users.filter((u) => u.role === 'teacher');
  const students = users.filter((u) => u.role === 'student');

  function UserRow({ u }: { u: User }) {
    const isMe = u.id === currentUser?.id;
    const isLastAdmin = u.role === 'admin' && admins.length <= 1;
    const busy = loading[u.id];

    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
          {u.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">{u.name}</span>
            {isMe && <span className="text-xs text-gray-400">(Du)</span>}
          </div>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
            {ROLE_LABELS[u.role]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditingPerms(u)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Berechtigungen bearbeiten"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          {!isMe && (
            <button
              onClick={() => handleForceLogout(u)}
              disabled={busy}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40"
              title="Ausloggen"
            >
              <ForceLogoutIcon className="w-4 h-4" />
            </button>
          )}
          {!isMe && !isLastAdmin && (
            <button
              onClick={() => handleDelete(u)}
              disabled={busy}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
              title="Konto löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isLastAdmin && (
            <span className="text-xs text-gray-400 px-2" title="Letzter Admin – nicht löschbar">
              <Shield className="w-4 h-4 inline" />
            </span>
          )}
        </div>
      </div>
    );
  }

  function Section({ title, list }: { title: string; list: User[] }) {
    if (!list.length) return null;
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title} ({list.length})</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {list.map((u) => <UserRow key={u.id} u={u} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header
        title="Admin-Panel"
        actions={
          <button onClick={fetchUsers} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 pb-20 md:pb-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Admins', count: admins.length, color: 'text-purple-600' },
            { label: 'Lehrer', count: teachers.length, color: 'text-green-600' },
            { label: 'Schüler', count: students.length, color: 'text-blue-600' },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{count}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <Section title="Admins" list={admins} />
        <Section title="Lehrer" list={teachers} />
        <Section title="Schüler" list={students} />

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 bg-red-50">
            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide">Gefahrenzone</h3>
          </div>
          <div className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Alle Chats löschen</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Löscht alle Nachrichten sowie alle DM- und Gruppen-Räume unwiderruflich.
                Der Global-Raum und Klassen-Räume bleiben erhalten.
              </p>
            </div>
            <button
              onClick={handleDeleteAllChats}
              disabled={deletingChats}
              className="flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <MessageSquareX className="w-4 h-4" />
              {deletingChats ? 'Löschen…' : 'Alle Chats löschen'}
            </button>
          </div>
        </div>
      </div>

      {editingPerms && (
        <PermissionsEditor
          user={editingPerms}
          onClose={() => setEditingPerms(null)}
          onSaved={handlePermsSaved}
        />
      )}
    </div>
  );
}
