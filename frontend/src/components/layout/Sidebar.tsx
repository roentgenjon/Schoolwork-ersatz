import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  ClipboardList,
  TrendingUp,
  FileText,
  MessageSquare,
  LogOut,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/classes', icon: <BookOpen size={20} />, label: 'Klassen' },
  { to: '/assignments', icon: <ClipboardList size={20} />, label: 'Aufgaben' },
  { to: '/progress', icon: <TrendingUp size={20} />, label: 'Fortschritt' },
  { to: '/handouts', icon: <FileText size={20} />, label: 'Materialien' },
  { to: '/chat', icon: <MessageSquare size={20} />, label: 'Chat' },
  { to: '/users', icon: <Users size={20} />, label: 'Nutzer', adminOnly: true },
]

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Lehrer',
  student: 'Schüler',
}

export default function Sidebar() {
  const { user, logout, initials, isStudent, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/onboarding')
  }

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside
      className="hidden md:flex flex-col h-full w-[260px] shrink-0"
      style={{ backgroundColor: '#1C1C1E', borderRight: '1px solid #38383A' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #38383A' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#007AFF' }}
        >
          <BookOpen size={20} color="#fff" />
        </div>
        <span className="text-white font-semibold text-lg">SchoolWork</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 ios-scroll">
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-in-out min-h-[44px]',
                    isActive
                      ? 'text-white font-medium'
                      : 'text-[#8E8E93] hover:text-white hover:bg-[#2C2C2E]'
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: 'rgba(0, 122, 255, 0.2)', color: '#007AFF' }
                    : {}
                }
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #38383A' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold"
            style={{ backgroundColor: '#007AFF' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[#8E8E93] text-xs">
              {user?.role ? (roleLabels[user.role] ?? user.role) : ''}
            </p>
          </div>
        </div>
        {!isStudent && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[#FF3B30] hover:bg-[#2C2C2E] transition-all duration-200 ease-in-out min-h-[44px]"
          >
            <LogOut size={20} />
            <span className="text-sm">Abmelden</span>
          </button>
        )}
      </div>
    </aside>
  )
}
