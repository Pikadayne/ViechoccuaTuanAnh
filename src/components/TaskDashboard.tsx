import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task, FilterStatus, AuthSession } from '../types/task';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import { AlertCircle, LogOut } from 'lucide-react';

interface TaskDashboardProps {
  session: AuthSession | null;
  onRequireLogin: () => void;
  onLogout: () => void;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  session,
  onRequireLogin,
  onLogout,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const inputRef = useRef<HTMLInputElement | null>(null);

  const apiFetch = useCallback(
    async (
      url: string,
      options: {
        method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
        body?: unknown;
      } = {}
    ) => {
      const method = options.method || 'GET';

      if (!session || !session.access_token) {
        onRequireLogin();
        throw new Error('Chưa đăng nhập. Đang chuyển về trang đăng nhập.');
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${session.access_token}`,
      };
      if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      const jsonBody = await response.json().catch(() => ({}));

      if (response.status === 401) {
        onLogout();
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }

      if (!response.ok) {
        throw new Error(jsonBody.error || `Yêu cầu thất bại (HTTP ${response.status})`);
      }

      return jsonBody;
    },
    [session, onRequireLogin, onLogout]
  );

  const loadTasks = useCallback(async () => {
    if (!session) {
      onRequireLogin();
      return;
    }

    setIsLoading(true);
    setApiError(null);
    try {
      const result = await apiFetch('/api/tasks', { method: 'GET' });
      setTasks(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Không tải được danh sách công việc');
    } finally {
      setIsLoading(false);
    }
  }, [session, apiFetch, onRequireLogin]);

  useEffect(() => {
    if (!session) {
      onRequireLogin();
    } else {
      loadTasks();
    }
  }, [session, loadTasks, onRequireLogin]);

  if (!session) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <p className="text-sm font-semibold text-slate-900">
          Đang kiểm tra đăng nhập...
        </p>
      </div>
    );
  }

  const handleAddTask = async (title: string): Promise<{ ok: boolean; error?: string }> => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: { title },
      });
      await loadTasks();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thêm được công việc';
      setApiError(msg);
      return { ok: false, error: msg };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDone = async (
    id: string,
    nextDone: boolean
  ): Promise<{ ok: boolean; error?: string }> => {
    setBusyTaskId(id);
    setApiError(null);
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: { is_done: nextDone },
      });
      await loadTasks();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không cập nhật được trạng thái';
      setApiError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleUpdateTitle = async (
    id: string,
    nextTitle: string
  ): Promise<{ ok: boolean; error?: string }> => {
    setBusyTaskId(id);
    setApiError(null);
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: { title: nextTitle },
      });
      await loadTasks();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không sửa được tên công việc';
      setApiError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleDeleteTask = async (
    id: string
  ): Promise<{ ok: boolean; error?: string }> => {
    setBusyTaskId(id);
    setApiError(null);
    try {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      await loadTasks();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không xóa được công việc';
      setApiError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusyTaskId(null);
    }
  };

  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => !t.is_done).length;
  const doneCount = tasks.filter((t) => t.is_done).length;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !t.is_done;
    if (filter === 'done') return t.is_done;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-7 shadow-xs">
        {/* Header: Việc học của tôi | [Đăng xuất] */}
        <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Việc học của tôi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tài khoản: {session.user.fullName || session.user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Section title: Danh sách công việc */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Danh sách công việc
          </h2>
        </div>

        {/* Thông báo lỗi nếu có */}
        {apiError && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-3 text-xs text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900">Có lỗi xảy ra</div>
                <div className="mt-0.5 leading-relaxed">{apiError}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApiError(null)}
              className="text-red-700 underline hover:text-red-900 whitespace-nowrap cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Form thêm công việc */}
        <TaskForm
          inputRef={inputRef}
          onAddTask={handleAddTask}
          isSubmitting={isSubmitting}
        />

        {/* Bộ lọc: [Tất cả] [Chưa xong] [Đã xong] */}
        <div className="py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Bộ lọc trạng thái công việc"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              aria-pressed={filter === 'pending'}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                filter === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa xong ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('done')}
              aria-pressed={filter === 'done'}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                filter === 'done'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã xong ({doneCount})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums">
            Hiển thị {filteredTasks.length}/{totalCount} mục
          </div>
        </div>

        {/* Danh sách công việc */}
        <TaskList
          tasks={filteredTasks}
          filter={filter}
          isLoading={isLoading}
          busyTaskId={busyTaskId}
          onToggleDone={handleToggleDone}
          onUpdateTitle={handleUpdateTitle}
          onDeleteTask={handleDeleteTask}
          onFocusInput={() => inputRef.current?.focus()}
        />
      </div>
    </div>
  );
};
