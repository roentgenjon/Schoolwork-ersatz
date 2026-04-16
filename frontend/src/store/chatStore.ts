import { create } from 'zustand'
import { client } from '../api/client'
import type { ChatRoom, ChatMessage } from '../types'

interface ChatStore {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  activeRoom: string | null
  ws: WebSocket | null
  loading: boolean
  error: string | null
  fetchRooms: () => Promise<void>
  fetchMessages: (roomId: string) => Promise<void>
  connectToRoom: (roomId: string) => void
  sendMessage: (content: string) => void
  setActiveRoom: (roomId: string) => void
  disconnect: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  rooms: [],
  messages: {},
  activeRoom: null,
  ws: null,
  loading: false,
  error: null,

  fetchRooms: async () => {
    set({ loading: true, error: null })
    try {
      const rooms = await client.get<ChatRoom[]>('/chat/rooms')
      set({ rooms, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchMessages: async (roomId: string) => {
    try {
      const messages = await client.get<ChatMessage[]>(`/chat/rooms/${roomId}/messages`)
      set((state) => ({
        messages: { ...state.messages, [roomId]: messages },
      }))
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  connectToRoom: (roomId: string) => {
    const { ws } = get()
    if (ws) {
      ws.close()
    }

    const token = localStorage.getItem('token')
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.hostname === 'localhost'
      ? 'localhost:8787'
      : window.location.host
    const wsUrl = `${wsProtocol}//${wsHost}/api/chat/rooms/${roomId}/ws${token ? `?token=${token}` : ''}`

    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      set({ ws: socket })
    }

    socket.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as ChatMessage
        set((state) => {
          const existing = state.messages[roomId] ?? []
          return {
            messages: { ...state.messages, [roomId]: [...existing, message] },
            rooms: state.rooms.map((r) =>
              r.id === roomId ? { ...r, unread_count: 0 } : r
            ),
          }
        })
      } catch {
        // ignore parse errors
      }
    }

    socket.onerror = () => {
      set({ error: 'WebSocket connection error' })
    }

    socket.onclose = () => {
      set((state) => ({ ws: state.ws === socket ? null : state.ws }))
    }

    set({ ws: socket })
  },

  sendMessage: (content: string) => {
    const { ws, activeRoom } = get()
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeRoom) return

    ws.send(JSON.stringify({ type: 'message', content }))
  },

  setActiveRoom: (roomId: string) => {
    const { fetchMessages, connectToRoom } = get()
    set({ activeRoom: roomId })
    fetchMessages(roomId)
    connectToRoom(roomId)
    // Reset unread count
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r
      ),
    }))
  },

  disconnect: () => {
    const { ws } = get()
    if (ws) {
      ws.close()
      set({ ws: null })
    }
  },
}))
