import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileText,
  MessageSquare,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../hooks/useAuth'

export default function TabBar() {
  const { isAdmin } = useAuth()

  const tabs = [
    { to: '/', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
    { to: '/classes', icon: <BookOpen size={22} />, label: 'Klassen' },
    { to: '/assignments', icon: <ClipboardList size={22} />, label: 'Aufgaben' },
    { to: '/handouts', icon: <FileText size={22} />, label: 'Handouts' },
    { to: '/chat', icon: <MessageSquare size={22} />, label: 'Chat' },
    ...(isAdmin ? [{ to: '/users', icon: <Users size={22} />, label: 'Nutzer' }] : []),
  ]

  return (
    <nav
      className="md:hidden flex items-center justify-around px-2 pb-safe-bottom"
      style={{
        backgroundColor: 'rgba(28, 28, 30, 0.95)',
        borderTop: '1px solid #38383A',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        paddingTop: '8px',
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-0.5 px-3 py-1 min-w-[44px] min-h-[44px] justify-center rounded-lg transition-all duration-200 ease-in-out',
              isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'
            )
          }
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
