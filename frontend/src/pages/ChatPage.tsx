import { useEffect, useRef, useState } from 'react'
import { Send, Hash, MessageCircle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import { useChatStore } from '../store/chatStore'
import { useAuth } from '../hooks/useAuth'
import type { ChatMessage, ChatRoom } from '../types'

export default function ChatPage() {
  const { rooms, messages, activeRoom, fetchRooms, setActiveRoom, sendMessage } =
    useChatStore()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    if (rooms.length > 0 && !activeRoom) {
      const globalRoom = rooms.find((r) => r.type === 'global') ?? rooms[0]
      if (globalRoom) setActiveRoom(globalRoom.id)
    }
  }, [rooms, activeRoom, setActiveRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeRoom])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  const activeMessages: ChatMessage[] = activeRoom ? (messages[activeRoom] ?? []) : []
  const activeRoomData: ChatRoom | undefined = rooms.find((r) => r.id === activeRoom)

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Room sidebar */}
        <div
          className="w-64 shrink-0 flex flex-col hidden md:flex"
          style={{ borderRight: '1px solid #38383A', backgroundColor: '#1C1C1E' }}
        >
          <div
            className="px-4 py-4 shrink-0"
            style={{ borderBottom: '1px solid #38383A' }}
          >
            <h2 className="text-white font-semibold">Nachrichten</h2>
          </div>
          <div className="flex-1 ios-scroll py-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200"
                style={{
                  backgroundColor: activeRoom === room.id ? '#2C2C2E' : 'transparent',
                  borderRadius: activeRoom === room.id ? '12px' : '0',
                  margin: '0 8px',
                  width: 'calc(100% - 16px)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#007AFF20', color: '#007AFF' }}
                >
                  {room.type === 'global' ? (
                    <Hash size={16} />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {room.name ?? (room.type === 'global' ? 'Alle' : room.id)}
                  </p>
                  <p className="text-[#8E8E93] text-xs capitalize">
                    {room.type === 'global' ? 'Globaler Chat' :
                      room.type === 'class' ? 'Klassen-Chat' : 'Direktnachricht'}
                  </p>
                </div>
                {(room.unread_count ?? 0) > 0 && (
                  <span
                    className="text-white text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: '#FF3B30', minWidth: '20px', textAlign: 'center' }}
                  >
                    {room.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          <Header title={activeRoomData?.name ?? 'Chat'} />

          {/* Messages */}
          <div className="flex-1 ios-scroll px-4 py-4 space-y-3">
            {activeMessages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-[#8E8E93] text-sm">Noch keine Nachrichten.</p>
              </div>
            )}
            {activeMessages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              const initials = (msg.sender_name ?? '?')
                .split(' ')
                .map((p) => p[0] ?? '')
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {!isMe && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mb-0.5"
                      style={{
                        backgroundColor:
                          msg.sender_role === 'teacher' ? '#FF9F0A' :
                          msg.sender_role === 'admin' ? '#BF5AF2' : '#007AFF'
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isMe && (
                      <span className="text-[#8E8E93] text-xs mb-1 px-1">
                        {msg.sender_name}
                      </span>
                    )}
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={{
                        backgroundColor: isMe ? '#007AFF' : '#2C2C2E',
                        color: '#fff',
                        borderBottomRightRadius: isMe ? '6px' : '16px',
                        borderBottomLeftRadius: isMe ? '16px' : '6px',
                      }}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[#48484A] text-xs mt-1 px-1">
                      {new Date(msg.created_at * 1000).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderTop: '1px solid #38383A' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht schreiben…"
              className="flex-1 px-4 py-3 rounded-full text-white text-sm outline-none min-h-[44px]"
              style={{ backgroundColor: '#2C2C2E', border: '1px solid #38383A' }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = '#007AFF')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = '#38383A')
              }
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-200 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: '#007AFF' }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
