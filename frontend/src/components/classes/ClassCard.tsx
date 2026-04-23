import { Users } from 'lucide-react'
import type { Class } from '../../types'

interface ClassCardProps {
  cls: Class
  onClick: () => void
}

export default function ClassCard({ cls, onClick }: ClassCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col p-5 rounded-2xl text-left transition-all duration-200 ease-in-out active:scale-95 hover:brightness-110 min-h-[160px]"
      style={{ backgroundColor: '#1C1C1E', border: '1px solid #38383A' }}
    >
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-auto">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${cls.color}30` }}
        >
          {cls.icon}
        </div>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: cls.color }}
        />
      </div>

      {/* Name and subject */}
      <div className="mt-4">
        <h3 className="text-white font-semibold text-base leading-tight">{cls.name}</h3>
        <p className="text-[#8E8E93] text-sm mt-1">{cls.subject}</p>
      </div>

      {/* Student count */}
      {cls.student_count !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          <Users size={13} color="#8E8E93" />
          <span className="text-[#8E8E93] text-xs">{cls.student_count} Schüler</span>
        </div>
      )}
    </button>
  )
}
