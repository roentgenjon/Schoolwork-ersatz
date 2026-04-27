import { useEffect, useRef, useState } from 'react';
import { Send, Hash, Globe, Plus, Trash2, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { createWebSocket, api } from '../api/client';
import type { ChatMessage, ChatRoom, User } from '../types';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-green-100 text-green-700',
  student: 'bg-blue-100 text-blue-700',
};

type WsStatus = 'connecting' | 'open' | 'closed';

function CreateRoomModal({
  onClose,
  onCreated,
  allUsers,
  currentUserId,
}: {
  onClose: () => void;
  onCreated: () => void;
  allUsers: User[];
  currentUserId: string;
}) {
  const [mode, setMode] = useState<'dm' | 'group'>('dm');
  const [targetUserId, setTargetUserId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const others = allUsers.filter((u) => u.id !== currentUserId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'dm') {
        if (!targetUserId) { setError('Bitte einen Nutzer wählen'); setLoading(false); return; }
        await api.post('/api/chat/rooms', { type: 'dm', target_user_id: targetUserId });
      } else {
        if (!groupName.trim()) { setError('Gruppenname erforderlich'); setLoading(false); return; }
        await api.post('/api/chat/rooms', { type: 'group', name: groupName.trim() });
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <form onSubmit={submit} className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-sm p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Neuer Chat</h2>

        <div className="flex gap-2">
          {(['dm', 'group'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                mode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m === 'dm' ? 'Direktnachricht' : 'Gruppe'}
            </button>
          ))}
        </div>

        {mode === 'dm' ? (
          <div>
            <label className="text-sm font-medium text-gray-700">Nutzer</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wählen…</option>
              {others.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-gray-700">Gruppenname</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="z.B. Projektgruppe A"
              className="mt-1 w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</div>}

        <div className="flex gap-3">
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

export default function ChatPage() {
  const { chatRooms, messages, fetchChatRooms, fetchRoomMessages, addMessage, activeRoomId, setActiveRoom } =
    useAppStore();
  const { user } = useAuthStore();

  const [input, setInput] = useState('');
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [showCreate, setShowCreate] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // useRef keeps a stable reference so sendMessage never closes over a stale socket
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchChatRooms();
    if (isAdmin) {
      api.get<User[]>('/api/users').then(setAllUsers).catch(() => {});
    } else {
      // Non-admins can still start DMs — fetch basic user list via a lightweight endpoint
      api.get<User[]>('/api/users').then(setAllUsers).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (chatRooms.length > 0 && !activeRoomId) {
      const global = chatRooms.find((r) => r.type === 'global');
      setActiveRoom(global?.id || chatRooms[0].id);
    }
  }, [chatRooms]);

  useEffect(() => {
    if (!activeRoomId) return;

    fetchRoomMessages(activeRoomId);
    setWsStatus('connecting');

    const socket = createWebSocket(activeRoomId);
    wsRef.current = socket;

    socket.onopen = () => setWsStatus('open');

    socket.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.type === 'message') {
          addMessage(activeRoomId, msg); // store deduplicates by id
        }
      } catch {}
    };

    socket.onclose = () => {
      setWsStatus('closed');
      wsRef.current = null;
    };

    socket.onerror = () => {
      setWsStatus('closed');
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomId]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const ws = wsRef.current;
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', content: input.trim() }));
    setInput('');
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Diesen Chat wirklich löschen?')) return;
    try {
      await api.delete(`/api/chat/rooms/${roomId}`);
      if (activeRoomId === roomId) setActiveRoom(null);
      await fetchChatRooms();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  }

  const currentMessages: ChatMessage[] = activeRoomId ? (messages[activeRoomId] ?? []) : [];
  const activeRoom = chatRooms.find((r) => r.id === activeRoomId);

  function roomLabel(room: ChatRoom): string {
    if (room.type === 'global') return 'Global';
    if (room.type === 'dm') return room.name || 'Direktnachricht';
    return room.name || room.id;
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Room sidebar */}
      <div className="w-48 md:w-64 border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Räume</p>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Neuer Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chatRooms.map((room) => (
            <div key={room.id} className="group relative">
              <button
                onClick={() => setActiveRoom(room.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors pr-8 ${
                  activeRoomId === room.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {room.type === 'global' ? (
                  <Globe className="w-4 h-4 flex-shrink-0" />
                ) : room.type === 'dm' ? (
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <Hash className="w-4 h-4 flex-shrink-0" />
                )}
                <span className="truncate">{roomLabel(room)}</span>
              </button>

              {/* DM rooms deletable by anyone; group rooms by admin/teacher */}
              {(room.type === 'dm' || (room.type === 'group' && (isAdmin || user?.role === 'teacher'))) && (
                <button
                  onClick={() => handleDeleteRoom(room.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Header
          title={activeRoom ? roomLabel(activeRoom) : 'Chat'}
          actions={
            <span
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                wsStatus === 'open'
                  ? 'bg-green-100 text-green-700'
                  : wsStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {wsStatus === 'open' ? (
                <><Wifi className="w-3 h-3" /> Verbunden</>
              ) : wsStatus === 'connecting' ? (
                <>Verbinde…</>
              ) : (
                <><WifiOff className="w-3 h-3" /> Getrennt</>
              )}
            </span>
          }
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
          {currentMessages.length === 0 && (
            <div className="text-center text-gray-400 py-16 text-sm">Noch keine Nachrichten</div>
          )}
          {currentMessages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      ROLE_COLORS[msg.sender_role || 'student']
                    }`}
                  >
                    {(msg.sender_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-xs md:max-w-md flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-xs text-gray-500 px-1">{msg.sender_name}</span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-400 px-1">
                    {new Date(msg.created_at * 1000).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-gray-200 p-3 flex gap-2 bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              wsStatus === 'open'
                ? 'Nachricht schreiben…'
                : wsStatus === 'connecting'
                ? 'Verbinde…'
                : 'Keine Verbindung'
            }
            disabled={wsStatus !== 'open'}
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || wsStatus !== 'open'}
            className="bg-blue-600 text-white p-2.5 rounded-2xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchChatRooms}
          allUsers={allUsers}
          currentUserId={user?.id ?? ''}
        />
      )}
    </div>
  );
}
