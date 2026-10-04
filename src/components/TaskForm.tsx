import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';

interface TaskFormProps {
  onAddTask: (title: string) => Promise<{ ok: boolean; error?: string }>;
  isSubmitting: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onAddTask,
  isSubmitting,
  inputRef,
}) => {
  const [title, setTitle] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();

    if (trimmed.length < 1 || trimmed.length > 120) {
      setValidationError('Tên công việc phải có từ 1 đến 120 ký tự.');
      return;
    }

    setValidationError(null);
    const result = await onAddTask(trimmed);
    if (result.ok) {
      setTitle('');
    } else if (result.error) {
      setValidationError(result.error);
    }
  };

  return (
    <div className="border-b border-slate-200 pb-5">
      <form onSubmit={handleSubmit} noValidate aria-label="Biểu mẫu thêm công việc">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="task-title-input"
            className="text-sm font-semibold text-slate-900"
          >
            Tên công việc
          </label>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {title.trim().length}/120 ký tự
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 min-w-0">
            <input
              ref={inputRef}
              id="task-title-input"
              name="title"
              type="text"
              value={title}
              disabled={isSubmitting}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Ví dụ: Ôn tập React, làm bài tập Next.js..."
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'task-title-error' : undefined}
              className={`w-full h-11 px-3.5 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 transition-colors disabled:bg-slate-50 disabled:text-slate-400 ${
                validationError ? 'border-red-600' : 'border-slate-300 hover:border-slate-400'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 px-5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{isSubmitting ? 'Đang lưu...' : 'Thêm công việc'}</span>
          </button>
        </div>

        {validationError && (
          <div
            id="task-title-error"
            role="alert"
            className="mt-2 flex items-start gap-2 text-xs text-red-600 font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}
      </form>
    </div>
  );
};
