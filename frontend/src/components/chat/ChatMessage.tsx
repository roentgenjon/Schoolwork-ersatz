import { clsx } from 'clsx'
import type { ChatMessage as ChatMessageType } from '../../types'
import { useAuth } from '../../hooks/useAuth'

interface ChatMessageProps {
  message: ChatMessageType
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const roleColors: Record<string, string> = {
  admin: '#FF9F0A',
  teacher: '#007AFF',
  student: '#34C759',
}

export default function ChatMessageComponent({ message }: ChatMessageProps) {
  const { user } = useAuth()
  const isOwn = user?.id === message.sender_id
  const initials = message.sender_name ? getInitials(message.sender_name) : '?'
  const avatarColor = message.sender_role ? (roleColors[message.sender_role] ?? '#007AFF') : '#007AFF'

  return (
    <div
      className={clsx(
        'flex items-end gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mb-1"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
      )}

      <div
        className={clsx(
          'flex flex-col gap-1 max-w-[70%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name (only for others) */}
        {!isOwn && message.sender_name && (
          <span className="text-xs font-medium px-1" style={{ color: avatarColor }}>
            {message.sender_name}
          </span>
        )}

        {/* Message bubble */}
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={{
            backgroundColor: isOwn ? '#007AFF' : '#2C2C2E',
            color: '#fff',
            borderBottomRightRadius: isOwn ? '4px' : '18px',
            borderBottomLeftRadius: isOwn ? '18px' : '4px',
          }}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-xs px-1" style={{ color: '#636366' }}>
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
