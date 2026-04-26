import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, School, ClipboardList, FileText, MessageCircle, Shield, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function TabBar() {
  const { user } = useAuthStore();

  const adminTabs = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/admin', icon: Shield, label: 'Admin' },
    { to: '/classes', icon: School, label: 'Klassen' },
    { to: '/assignments', icon: ClipboardList, label: 'Aufgaben' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
  ];

  const teacherTabs = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/classes', icon: School, label: 'Klassen' },
    { to: '/assignments', icon: ClipboardList, label: 'Aufgaben' },
    { to: '/progress', icon: TrendingUp, label: 'Fortschritt' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
  ];

  const studentTabs = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/classes', icon: School, label: 'Klassen' },
    { to: '/assignments', icon: ClipboardList, label: 'Aufgaben' },
    { to: '/handouts', icon: FileText, label: 'Materialien' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' },
  ];

  const tabs = user?.role === 'admin' ? adminTabs : user?.role === 'teacher' ? teacherTabs : studentTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <Icon className="w-6 h-6 mb-0.5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
