import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, ClipboardList, FileText, Users, ArrowRight } from 'lucide-react';
import Header from '../components/layout/Header';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { classes, assignments, handouts, users, fetchClasses, fetchAssignments, fetchHandouts, fetchUsers } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClasses();
    fetchAssignments();
    fetchHandouts();
    if (user?.role === 'admin') fetchUsers();
  }, []);

  const pending = assignments.filter((a) => {
    const sub = (a as any).submissions?.[0];
    return !sub || sub.status === 'not_started';
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    return 'Guten Abend';
  })();

  const stats = user?.role === 'admin'
    ? [
        { icon: Users, label: 'Nutzer', value: users.length, path: '/admin', color: 'text-purple-600 bg-purple-50' },
        { icon: School, label: 'Klassen', value: classes.length, path: '/classes', color: 'text-blue-600 bg-blue-50' },
        { icon: ClipboardList, label: 'Aufgaben', value: assignments.length, path: '/assignments', color: 'text-orange-600 bg-orange-50' },
      ]
    : user?.role === 'teacher'
    ? [
        { icon: School, label: 'Klassen', value: classes.length, path: '/classes', color: 'text-blue-600 bg-blue-50' },
        { icon: ClipboardList, label: 'Aufgaben', value: assignments.length, path: '/assignments', color: 'text-orange-600 bg-orange-50' },
        { icon: FileText, label: 'Materialien', value: handouts.length, path: '/handouts', color: 'text-green-600 bg-green-50' },
      ]
    : [
        { icon: School, label: 'Meine Klassen', value: classes.length, path: '/classes', color: 'text-blue-600 bg-blue-50' },
        { icon: ClipboardList, label: 'Aufgaben', value: assignments.length, path: '/assignments', color: 'text-orange-600 bg-orange-50' },
        { icon: ClipboardList, label: 'Ausstehend', value: pending.length, path: '/assignments', color: 'text-red-600 bg-red-50' },
      ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}!</h2>
          <p className="text-gray-500 mt-1 capitalize">{user?.role}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ icon: Icon, label, value, path, color }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-300 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </button>
          ))}
        </div>

        {classes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Klassen</h3>
              <button onClick={() => navigate('/classes')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Alle <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {classes.slice(0, 3).map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => navigate(`/classes/${cls.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:border-blue-300 transition-all text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: cls.color + '20', color: cls.color }}
                  >
                    {cls.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{cls.name}</div>
                    {cls.subject && <div className="text-sm text-gray-500 truncate">{cls.subject}</div>}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {assignments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Aktuelle Aufgaben</h3>
              <button onClick={() => navigate('/assignments')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Alle <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {assignments.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/assignments/${a.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:border-blue-300 transition-all text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{a.title}</div>
                    <div className="text-sm text-gray-500">{a.class_name} · {a.type}</div>
                  </div>
                  {a.due_date && (
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(a.due_date * 1000).toLocaleDateString('de-DE')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
