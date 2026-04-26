import { useEffect, useRef, useState } from 'react';
import { Send, Hash, Globe } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { createWebSocket } from '../api/client';
import type { ChatMessage, ChatRoom } from '../types';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-green-100 text-green-700',
  student: 'bg-blue-100 text-blue-700',
};

export default function ChatPage() {
  const { chatRooms, messages, fetchChatRooms, fetchRoomMessages, addMessage, activeRoomId, setActiveRoom } = useAppStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchChatRooms(); }, []);

  useEffect(() => {
    if (chatRooms.length > 0 && !activeRoomId) {
      const global = chatRooms.find((r) => r.type === 'global');
      setActiveRoom(global?.id || chatRooms[0].id);
    }
  }, [chatRooms]);

  useEffect(() => {
    if (!activeRoomId) return;
    fetchRoomMessages(activeRoomId);

    const socket = createWebSocket(activeRoomId);
    socket.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'message') {
          addMessage(activeRoomId, msg);
        }
      } catch {}
    };
    setWs(socket);
    return () => { socket.close(); };
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomId]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'message', content: input.trim() }));
    setInput('');
  }

  const currentMessages: ChatMessage[] = activeRoomId ? (messages[activeRoomId] || []) : [];
  const activeRoom = chatRooms.find((r) => r.id === activeRoomId);

  return (
    <div className="flex-1 flex min-h-0">
      {/* Room sidebar */}
      <div className="w-48 md:w-64 border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
        <div className="p-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Räume</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                activeRoomId === room.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {room.type === 'global' ? <Globe className="w-4 h-4 flex-shrink-0" /> : <Hash className="w-4 h-4 flex-shrink-0" />}
              <span className="truncate">{room.name || room.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Header title={activeRoom?.name || 'Chat'} />

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20 md:pb-4">
          {currentMessages.length === 0 && (
            <div className="text-center text-gray-400 py-16 text-sm">Noch keine Nachrichten</div>
          )}
          {currentMessages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ROLE_COLORS[msg.sender_role || 'student']}`}>
                    {(msg.sender_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-xs md:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isMe && (
                    <span className="text-xs text-gray-500 px-1">{msg.sender_name}</span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-400 px-1">
                    {new Date(msg.created_at * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
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
            placeholder="Nachricht schreiben…"
            className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={!input.trim()}
            className="bg-blue-600 text-white p-2.5 rounded-2xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
