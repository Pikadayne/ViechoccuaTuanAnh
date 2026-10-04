import React, { useState } from 'react';
import { Task } from '../types/task';
import { Check, Pencil, Trash2, X, AlertCircle } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onToggleDone: (id: string, nextDone: boolean) => Promise<{ ok: boolean; error?: string }>;
  onUpdateTitle: (id: string, nextTitle: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteTask: (id: string) => Promise<{ ok: boolean; error?: string }>;
  isBusy: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleDone,
  onUpdateTitle,
  onDeleteTask,
  isBusy,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftTitle.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      setEditError('Tên công việc phải dài từ 1–120 ký tự.');
      return;
    }
    setEditError(null);
    const res = await onUpdateTitle(task.id, trimmed);
    if (res.ok) {
      setIsEditing(false);
    } else if (res.error) {
      setEditError(res.error);
    }
  };

  const handleCancelEdit = () => {
    setDraftTitle(task.title);
    setEditError(null);
    setIsEditing(false);
  };

  const formattedDate = (() => {
    try {
      const d = new Date(task.created_at);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return task.created_at;
    }
  })();

  const checkboxId = `task-checkbox-${task.id}`;
  const editInputId = `task-edit-input-${task.id}`;

  return (
    <li
      data-testid="task-item"
      className="py-3.5 px-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
    >
      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor={editInputId}
              className="text-xs font-semibold text-slate-700"
            >
              Sửa tên công việc
            </label>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {draftTitle.trim().length}/120
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id={editInputId}
              type="text"
              value={draftTitle}
              disabled={isBusy}
              onChange={(e) => {
                setDraftTitle(e.target.value);
                if (editError) setEditError(null);
              }}
              autoFocus
              className="flex-1 h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isBusy}
                className="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu</span>
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleCancelEdit}
                className="h-10 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hủy</span>
              </button>
            </div>
          </div>
          {editError && (
            <div role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{editError}</span>
            </div>
          )}
        </form>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="pt-0.5 flex items-center">
              <input
                id={checkboxId}
                type="checkbox"
                checked={task.is_done}
                disabled={isBusy}
                onChange={(e) => onToggleDone(task.id, e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="min-w-0 flex-1">
              <label
                htmlFor={checkboxId}
                className={`block text-sm font-medium leading-snug cursor-pointer select-none break-words ${
                  task.is_done ? 'line-through text-slate-400' : 'text-slate-900'
                }`}
              >
                {task.title}
              </label>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span
                  className={
                    task.is_done
                      ? 'text-emerald-700 font-medium'
                      : 'text-amber-700 font-medium'
                  }
                >
                  {task.is_done ? 'Đã hoàn thành' : 'Chưa xong'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {confirmingDelete ? (
              <div
                role="group"
                aria-label="Xác nhận xóa công việc"
                className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg"
              >
                <span className="text-xs text-red-800 font-medium whitespace-nowrap mr-1">
                  Chắc chắn xóa?
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    await onDeleteTask(task.id);
                    setConfirmingDelete(false);
                  }}
                  className="h-7 px-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                >
                  Xác nhận xóa
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmingDelete(false)}
                  className="h-7 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setDraftTitle(task.title);
                    setEditError(null);
                    setIsEditing(true);
                  }}
                  className="h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmingDelete(true)}
                  className="h-9 px-3 bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
};
