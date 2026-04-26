import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Shield, GraduationCap, School, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { Role, User } from '../types';

type Step = 'welcome' | 'role' | 'register' | 'login';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name erforderlich'); return; }
    if ((role === 'admin' || role === 'teacher') && !password.trim()) {
      setError('Passwort erforderlich'); return;
    }
    setLoading(true);
    setError('');
    try {
      let data: { token: string; user: User };
      if (isLogin) {
        data = await api.post<{ token: string; user: User }>('/api/auth/login', { name, password });
      } else {
        data = await api.post<{ token: string; user: User }>('/api/auth/register', { name, role, password: password || undefined });
      }
      setAuth(data.user, data.token);
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 flex flex-col items-center justify-center p-8">
        <div className="text-white text-center space-y-6 max-w-sm">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">SchoolWork</h1>
            <p className="text-blue-200 text-lg mt-2">Deine Schule. Digital.</p>
          </div>
          <button
            onClick={() => setStep('role')}
            className="w-full bg-white text-blue-700 font-semibold py-4 px-8 rounded-2xl text-lg flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setIsLogin(true); setStep('register'); }}
            className="text-blue-200 hover:text-white text-sm transition-colors"
          >
            Bereits registriert? Einloggen
          </button>
        </div>
      </div>
    );
  }

  if (step === 'role') {
    const roles: { role: Role; icon: typeof Shield; label: string; desc: string; color: string }[] = [
      { role: 'admin', icon: Shield, label: 'Admin', desc: 'Schule verwalten', color: 'bg-purple-100 text-purple-700' },
      { role: 'teacher', icon: GraduationCap, label: 'Lehrer', desc: 'Klassen & Aufgaben', color: 'bg-green-100 text-green-700' },
      { role: 'student', icon: School, label: 'Schüler', desc: 'Lernen & Einreichen', color: 'bg-blue-100 text-blue-700' },
    ];

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Wer bist du?</h2>
            <p className="text-gray-500 mt-1">Wähle deine Rolle</p>
          </div>
          <div className="space-y-3">
            {roles.map(({ role: r, icon: Icon, label, desc, color }) => (
              <button
                key={r}
                onClick={() => { setRole(r); setStep('register'); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{label}</div>
                  <div className="text-sm text-gray-500">{desc}</div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Willkommen zurück' : 'Konto erstellen'}
          </h2>
          {role && !isLogin && (
            <p className="text-gray-500 mt-1 capitalize">{role}</p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein vollständiger Name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {(isLogin || role === 'admin' || role === 'teacher') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl text-base hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Bitte warten…' : isLogin ? 'Einloggen' : 'Konto erstellen'}
        </button>

        {!isLogin && (
          <button
            type="button"
            onClick={() => setStep('role')}
            className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
          >
            Rolle ändern
          </button>
        )}
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="w-full text-center text-blue-600 hover:text-blue-700 text-sm"
        >
          {isLogin ? 'Neues Konto erstellen' : 'Bereits registriert? Einloggen'}
        </button>
      </form>
    </div>
  );
}
