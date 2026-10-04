import { useState, useCallback, useEffect } from 'react';
import { ActiveRoute, AuthSession } from './types/task';
import { LoginForm } from './components/LoginForm';
import { TaskDashboard } from './components/TaskDashboard';
import { DefenseQuestions } from './components/DefenseQuestions';

const SESSION_STORAGE_KEY = 'vht_auth_session';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.access_token && parsed?.user) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const [route, setRoute] = useState<ActiveRoute>(() => {
    return session ? '/tasks' : '/login';
  });

  useEffect(() => {
    if (!session && route !== '/login') {
      setRoute('/login');
    }
  }, [session, route]);

  const handleLoginSuccess = useCallback((newSession: AuthSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch {
      // Ignore
    }
    setRoute('/tasks');
  }, []);

  const handleLogout = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setRoute('/login');
  }, []);

  const handleRequireLogin = useCallback(() => {
    setRoute('/login');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Navigation */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between shadow-xs">
        {/* Logo / Tên ứng dụng */}
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
          Việc học của tôi
        </span>

        {/* Các mục điều hướng khi ĐÃ ĐĂNG NHẬP */}
        {session ? (
          <div className="flex items-center gap-6">
            <nav aria-label="Điều hướng chính" className="flex items-center gap-5 text-sm font-medium">
              <button
                type="button"
                onClick={() => setRoute('/tasks')}
                className={`transition-colors pb-0.5 cursor-pointer ${
                  route === '/tasks'
                    ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Công việc
              </button>
              <button
                type="button"
                onClick={() => setRoute('/defense')}
                className={`transition-colors pb-0.5 cursor-pointer ${
                  route === '/defense'
                    ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Câu hỏi bảo vệ
              </button>
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              Đăng xuất
            </button>
          </div>
        ) : null}
      </header>

      {/* Nội dung chính */}
      <main className="flex-1">
        {(!session || route === '/login') && (
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        )}

        {session && route === '/tasks' && (
          <TaskDashboard
            session={session}
            onRequireLogin={handleRequireLogin}
            onLogout={handleLogout}
          />
        )}

        {session && route === '/defense' && <DefenseQuestions />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Việc học của tôi — Ứng dụng quản lý công việc học tập</span>
          {session && (
            <button
              type="button"
              onClick={() => setRoute('/defense')}
              className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Ôn tập câu hỏi bảo vệ
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
