import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../store/chatStore'

const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 5

export function useChat(roomId: string | null) {
  const { ws, connectToRoom, disconnect, sendMessage, messages, fetchMessages } = useChatStore()
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentRoomId = useRef<string | null>(null)

  const connect = useCallback(
    (id: string) => {
      connectToRoom(id)
      reconnectAttempts.current = 0
    },
    [connectToRoom]
  )

  const scheduleReconnect = useCallback(
    (id: string) => {
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) return

      reconnectTimer.current = setTimeout(() => {
        reconnectAttempts.current += 1
        connect(id)
      }, RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current))
    },
    [connect]
  )

  useEffect(() => {
    if (!roomId) return

    if (currentRoomId.current !== roomId) {
      currentRoomId.current = roomId
      connect(roomId)
      fetchMessages(roomId)
    }

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
    }
  }, [roomId, connect, fetchMessages])

  useEffect(() => {
    if (!ws || !roomId) return

    const handleClose = () => {
      scheduleReconnect(roomId)
    }

    ws.addEventListener('close', handleClose)
    return () => {
      ws.removeEventListener('close', handleClose)
    }
  }, [ws, roomId, scheduleReconnect])

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      disconnect()
    }
  }, [disconnect])

  const roomMessages = roomId ? (messages[roomId] ?? []) : []
  const isConnected = ws?.readyState === WebSocket.OPEN

  return {
    messages: roomMessages,
    sendMessage,
    isConnected,
    disconnect,
  }
}
