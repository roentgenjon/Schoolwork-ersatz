import { useEffect, useState } from 'react';
import { Shield, Trash2, LogOut as ForceLogoutIcon, Settings2, RefreshCw, MessageSquareX, UserPlus, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import Header from '../components/layout/Header';
import PermissionsEditor from '../components/admin/PermissionsEditor';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import type { User } from '../types';

interface AppSettings {
  registrationOpen: boolean;
  adminRegistrationAllowed: boolean;
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', teacher: 'Lehrer', student: 'Schüler' };
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-green-100 text-green-700',
  student: 'bg-blue-100 text-blue-700',
};

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`flex-shrink-0 transition-colors ${value ? 'text-blue-600' : 'text-gray-400'}`}
        title={value ? 'Deaktivieren' : 'Aktivieren'}
      >
        {value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name erforderlich'); return; }
    if ((role === 'admin' || role === 'teacher') && !password.trim()) {
      setError('Passwort für Admin/Lehrer erforderlich'); return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/api/users', { name: name.trim(), role, password: password || undefined });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Konto erstellen</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vollständiger Name"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="student">Schüler</option>
              <option value="teacher">Lehrer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {(role === 'admin' || role === 'teacher') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort festlegen"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Erstellen…' : 'Konto erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { users, fetchUsers, fetchChatRooms } = useAppStore();
  const { user: currentUser } = useAuthStore();
  const [editingPerms, setEditingPerms] = useState<User | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [deletingChats, setDeletingChats] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => { fetchUsers(); loadSettings(); }, []);

  async function loadSettings() {
    try {
      const s = await api.get<AppSettings>('/api/settings');
      setSettings(s);
    } catch {}
  }

  async function updateSetting(key: keyof AppSettings, value: boolean) {
    if (!settings) return;
    const prev = settings;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSavingSettings(true);
    try {
      const saved = await api.put<AppSettings>('/api/settings', updated);
      setSettings(saved);
    } catch (e: any) {
      setError(e.message);
      setSettings(prev);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleDeleteAllChats() {
    if (!confirm('Wirklich ALLE Nachrichten und alle DM/Gruppen-Räume löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    setDeletingChats(true);
    try {
      await api.delete('/api/chat/all');
      await fetchChatRooms();
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingChats(false);
    }
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Konto erstellen
            </button>
            <button onClick={fetchUsers} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
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

        {settings && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Registrierung</h3>
              {savingSettings && <span className="text-xs text-gray-400">Speichern…</span>}
            </div>
            <div className="px-4 divide-y divide-gray-100">
              <ToggleRow
                label="Registrierung offen"
                desc="Neue Benutzer können sich selbst registrieren"
                value={settings.registrationOpen}
                onChange={(v) => updateSetting('registrationOpen', v)}
              />
              <ToggleRow
                label="Admin-Selbstregistrierung"
                desc="Ob sich jemand selbst als Admin registrieren kann"
                value={settings.adminRegistrationAllowed}
                onChange={(v) => updateSetting('adminRegistrationAllowed', v)}
              />
            </div>
          </div>
        )}

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

      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={fetchUsers}
        />
      )}

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
