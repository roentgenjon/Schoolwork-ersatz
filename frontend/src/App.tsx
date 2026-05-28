import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TabBar from './components/layout/TabBar';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import ClassesPage, { ClassDetailPage } from './pages/ClassesPage';
import AssignmentsPage, { AssignmentDetailPage } from './pages/AssignmentsPage';
import HandoutsPage from './pages/HandoutsPage';
import ChatPage from './pages/ChatPage';
import ProgressPage from './pages/ProgressPage';
import AdminPage from './pages/AdminPage';
import { useAuthStore } from './store/authStore';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      <TabBar />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Laden…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  return (
    <Routes>
      <Route path="/" element={<OnboardingPage />} />
      <Route path="/dashboard" element={
        <RequireAuth>
          <AppLayout><DashboardPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/classes" element={
        <RequireAuth>
          <AppLayout><ClassesPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/classes/:id" element={
        <RequireAuth>
          <AppLayout><ClassDetailPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/assignments" element={
        <RequireAuth>
          <AppLayout><AssignmentsPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/assignments/:id" element={
        <RequireAuth>
          <AppLayout><AssignmentDetailPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/handouts" element={
        <RequireAuth>
          <AppLayout><HandoutsPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/progress" element={
        <RequireAuth>
          <AppLayout><ProgressPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/chat" element={
        <RequireAuth>
          <AppLayout><ChatPage /></AppLayout>
        </RequireAuth>
      } />
      <Route path="/admin" element={
        <RequireAuth>
          <RequireAdmin>
            <AppLayout><AdminPage /></AppLayout>
          </RequireAdmin>
        </RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
