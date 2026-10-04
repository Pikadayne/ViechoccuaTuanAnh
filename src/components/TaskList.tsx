import React from 'react';
import { Task, FilterStatus } from '../types/task';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  filter: FilterStatus;
  isLoading: boolean;
  busyTaskId: string | null;
  onToggleDone: (id: string, nextDone: boolean) => Promise<{ ok: boolean; error?: string }>;
  onUpdateTitle: (id: string, nextTitle: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteTask: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onFocusInput: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  filter,
  isLoading,
  busyTaskId,
  onToggleDone,
  onUpdateTitle,
  onDeleteTask,
  onFocusInput,
}) => {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="py-4 divide-y divide-slate-200"
      >
        {[1, 2, 3].map((item) => (
          <div key={item} className="py-3.5 px-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-4 h-4 rounded bg-slate-200 animate-pulse" />
              <div className="space-y-2 flex-1 max-w-md">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-14 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 w-14 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
        <span className="sr-only">Đang tải danh sách công việc...</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    const emptyMessage =
      filter === 'all'
        ? 'Chưa có công việc nào trong danh sách. Hãy thêm một mục tiêu học tập mới để bắt đầu.'
        : filter === 'pending'
        ? 'Không có công việc nào đang chờ hoàn thành.'
        : 'Chưa có công việc nào được đánh dấu hoàn thành.';

    return (
      <div className="py-12 px-4 text-center">
        <p className="text-sm font-medium text-slate-900">Danh sách công việc đang trống</p>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{emptyMessage}</p>
        {filter === 'all' && (
          <button
            type="button"
            onClick={onFocusInput}
            className="mt-4 h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            Nhập công việc đầu tiên
          </button>
        )}
      </div>
    );
  }

  return (
    <ul role="list" aria-label="Danh sách công việc học tập" className="divide-y divide-slate-200">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isBusy={busyTaskId === task.id}
          onToggleDone={onToggleDone}
          onUpdateTitle={onUpdateTitle}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </ul>
  );
};
