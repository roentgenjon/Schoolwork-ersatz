import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '../../types';
import { api } from '../../api/client';
import type { User } from '../../types';

interface Props {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}

export default function PermissionsEditor({ user, onClose, onSaved }: Props) {
  const [perms, setPerms] = useState<Set<string>>(new Set(user.permissions));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggle(perm: string) {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  async function save() {
    setLoading(true);
    setError('');
    try {
      await api.put(`/api/users/${user.id}/permissions`, { permissions: Array.from(perms) });
      onSaved({ ...user, permissions: Array.from(perms) });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Berechtigungen</h2>
            <p className="text-sm text-gray-500">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
          {ALL_PERMISSIONS.map((perm) => (
            <label key={perm} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={perms.has(perm)}
                onChange={() => toggle(perm)}
                className="w-4 h-4 rounded text-blue-600"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                {PERMISSION_LABELS[perm] || perm}
              </span>
            </label>
          ))}
        </div>

        {error && <div className="mx-6 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>}

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
