import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, LayoutDashboard, Users, School,
  ClipboardList, TrendingUp, FileText, MessageCircle, LogOut, Shield,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const teacherNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/classes', icon: School, label: 'Klassen' },
  { to: '/assignments', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/progress', icon: TrendingUp, label: 'Fortschritt' },
  { to: '/handouts', icon: FileText, label: 'Materialien' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
];

const studentNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/classes', icon: School, label: 'Klassen' },
  { to: '/assignments', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/handouts', icon: FileText, label: 'Materialien' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
];

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin', icon: Shield, label: 'Admin' },
  { to: '/classes', icon: School, label: 'Klassen' },
  { to: '/assignments', icon: ClipboardList, label: 'Aufgaben' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const nav = user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">SchoolWork</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Ausloggen
        </button>
      </div>
    </aside>
  );
}
