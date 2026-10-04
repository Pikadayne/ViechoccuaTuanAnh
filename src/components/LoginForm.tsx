import React, { useState } from 'react';
import { AuthSession } from '../types/task';
import { AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.session) {
        setErrorMsg(
          data.error ||
            'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.'
        );
        return;
      }

      onLoginSuccess(data.session);
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Việc học của tôi
          </h1>
          <h2 className="mt-2 text-base font-semibold text-slate-700">
            Đăng nhập
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold text-slate-900 mb-1.5"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={isLoading}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="nhap.email@example.com"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold text-slate-900 mb-1.5"
            >
              Mật khẩu
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={isLoading}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="••••••••"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 font-medium"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
            >
              <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
            </button>
          </div>
        </form>

        {/* Note 2 tài khoản thử nghiệm */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>Tài khoản thử nghiệm:</span>
            <span className="text-[11px] font-normal text-slate-500">Bấm để điền nhanh</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setEmail('tuananh.a@student.edu.vn');
                setPassword('MatKhauA@2026');
                setErrorMsg(null);
              }}
              className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <div className="font-semibold text-slate-900">Tài khoản A (Tuấn Anh)</div>
              <div className="text-slate-600 mt-0.5 font-mono text-[11px] break-all">
                Email: tuananh.a@student.edu.vn
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Mật khẩu: MatKhauA@2026
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('minhkhoa.b@student.edu.vn');
                setPassword('MatKhauB@2026');
                setErrorMsg(null);
              }}
              className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs text-slate-700 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <div className="font-semibold text-slate-900">Tài khoản B (Minh Khoa - đối chứng RLS)</div>
              <div className="text-slate-600 mt-0.5 font-mono text-[11px] break-all">
                Email: minhkhoa.b@student.edu.vn
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Mật khẩu: MatKhauB@2026
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
