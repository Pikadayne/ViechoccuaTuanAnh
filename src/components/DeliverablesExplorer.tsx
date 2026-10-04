import React, { useState } from 'react';
import { Copy, Check, FileCode, HelpCircle } from 'lucide-react';
import { SUPABASE_URL } from '../lib/supabase';

interface DeliverableFile {
  path: string;
  section: string;
  description: string;
  content: string;
}

const DELIVERABLE_FILES: DeliverableFile[] = [
  {
    path: 'supabase/schema.sql',
    section: 'Mục 2.3 — Bảng công việc & RLS',
    description:
      'Tạo bảng public.tasks (5 cột), index tasks_owner_created_idx, bật RLS và tạo đủ 4 chính sách (select, insert, update, delete).',
    content: `create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id)
    on delete cascade,
  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);
create index tasks_owner_created_idx
  on public.tasks (user_id, created_at desc);
alter table public.tasks enable row level security;
revoke all on public.tasks from anon, authenticated;
grant select, insert, update, delete
  on public.tasks to authenticated;

create policy "read own tasks" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own tasks" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own tasks" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "delete own tasks" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);`,
  },
  {
    path: 'src/lib/supabase.ts',
    section: 'Kết nối Supabase thực tế của Tuấn Anh',
    description:
      'Khởi tạo client Supabase đọc trực tiếp từ cấu hình dự án của Tuấn Anh.',
    content: `import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = '${SUPABASE_URL}';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_PGvgMRdRAzW3bO43bF2sbg_M7HFy10n';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});`,
  },
  {
    path: 'src/lib/auth-request.ts',
    section: 'Mục 2.5 — Backend xác minh người gọi API',
    description:
      'Helper phía server kiểm tra Authorization: Bearer <token> và xác minh qua db.auth.getUser(token).',
    content: `import { createClient } from '@supabase/supabase-js';

export async function authRequest(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: \`Bearer \${token}\` } },
      auth: { persistSession: false, autoRefreshToken: false }
    }
  );
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { db, user: data.user };
}`,
  },
  {
    path: 'src/app/api/tasks/route.ts',
    section: 'Mục 2.6 — API đọc (GET) và thêm (POST) công việc',
    description:
      'Xác thực qua authRequest, kiểm tra title 1–120 ký tự bằng Zod strict, gán user_id từ auth.user.id.',
    content: `import { z } from 'zod';
import { authRequest } from '@/lib/auth-request';
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status, headers: { 'Cache-Control': 'no-store' }
  });
const input = z.object({
  title: z.string().trim().min(1).max(120)
}).strict();

export async function GET(request: Request) {
  const auth = await authRequest(request);
  if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);
  const { data, error } = await auth.db.from('tasks')
    .select('id,title,is_done,created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return json({ error: 'Không tải được dữ liệu' }, 500);
  return json({ data });
}

export async function POST(request: Request) {
  const auth = await authRequest(request);
  if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);
  const parsed = input.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success)
    return json({ error: 'Tên phải có 1–120 ký tự' }, 400);
  const { data, error } = await auth.db.from('tasks')
    .insert({ title: parsed.data.title, user_id: auth.user.id })
    .select('id,title,is_done,created_at').single();
  if (error) return json({ error: 'Không thêm được công việc' }, 500);
  return json({ data }, 201);
}`,
  },
  {
    path: 'src/app/api/tasks/[id]/route.ts',
    section: 'Mục 2.7 — API sửa (PATCH) và xóa (DELETE) công việc',
    description:
      'Đọc params bất đồng bộ Promise<{ id: string }>, kiểm tra UUID, cấm field lạ/user_id, trả 404 nếu không tìm thấy hoặc thuộc người khác.',
    content: `import { z } from 'zod';
import { authRequest } from '@/lib/auth-request';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });

const idSchema = z.string().uuid();

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    is_done: z.boolean().optional()
  })
  .strict()
  .refine((val) => val.title !== undefined || val.is_done !== undefined, {
    message: 'Body không được rỗng'
  });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authRequest(request);
    if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return json({ error: 'Mã công việc không hợp lệ' }, 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Dữ liệu cập nhật không hợp lệ' }, 400);
    }

    const { data, error } = await auth.db
      .from('tasks')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('id,title,is_done,created_at')
      .maybeSingle();

    if (error) return json({ error: 'Không cập nhật được công việc' }, 500);
    if (!data) return json({ error: 'Không tìm thấy công việc' }, 404);

    return json({ data }, 200);
  } catch {
    return json({ error: 'Lỗi xử lý máy chủ' }, 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authRequest(request);
    if (!auth) return json({ error: 'Chưa đăng nhập' }, 401);

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return json({ error: 'Mã công việc không hợp lệ' }, 400);
    }

    const { data, error } = await auth.db
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .select('id');

    if (error) return json({ error: 'Không xóa được công việc' }, 500);
    if (!data || data.length === 0) {
      return json({ error: 'Không tìm thấy công việc' }, 404);
    }

    return json({ data: { id: data[0].id } }, 200);
  } catch {
    return json({ error: 'Lỗi xử lý máy chủ' }, 500);
  }
}`,
  },
  {
    path: '.env.example',
    section: 'Mục 2.2 — Tệp mẫu biến môi trường',
    description:
      'Chứa URL và Publishable key kết nối Supabase của Tuấn Anh.',
    content: `NEXT_PUBLIC_SUPABASE_URL=https://zoyxnbdvkjfjztktuxif.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_PGvgMRdRAzW3bO43bF2sbg_M7HFy10n`,
  },
];

interface QAItem {
  number: string;
  lab: string;
  question: string;
  answer: string;
}

const QA_LIST: QAItem[] = [
  {
    number: 'Câu 1 (Bài 1)',
    lab: 'Bài thực hành 1 — Mục 1.8',
    question: 'Vì sao reload làm mất thay đổi ở bài 1?',
    answer:
      'Ở Bài 1, danh sách công việc chỉ nằm trong bộ nhớ tạm (RAM) của trình duyệt thông qua React state (useState). Khi nhấn Reload (F5), trình duyệt tải lại trang từ đầu, giải phóng toàn bộ state tạm thời và khởi tạo lại mảng dữ liệu mẫu ban đầu vì chưa có cơ sở dữ liệu lưu trữ lâu dài.',
  },
  {
    number: 'Câu 2 (Bài 1)',
    lab: 'Bài thực hành 1 — Mục 1.8',
    question: 'page.tsx khác TaskItem như thế nào?',
    answer:
      'page.tsx là tệp đại diện cho một đường dẫn trang (route) trong App Router (ví dụ /tasks hoặc /login), chịu trách nhiệm bố cục tổng thể của trang đó. Trong khi đó, TaskItem là một component con có thể tái sử dụng nhiều lần, chỉ đảm nhận việc hiển thị và xử lý tương tác (checkbox, Sửa, Xóa) cho một công việc đơn lẻ trong danh sách.',
  },
  {
    number: 'Câu 3 (Bài 1)',
    lab: 'Bài thực hành 1 — Mục 1.8',
    question: 'Tại sao form đăng nhập hiện tại (ở Bài 1) chưa phải đăng nhập thật?',
    answer:
      'Form ở Bài 1 chỉ là giao diện mẫu được dựng theo thiết kế Stitch, chưa gửi thông tin đến máy chủ xác thực (Supabase Auth), chưa kiểm tra mật khẩu đúng/sai, không cấp access token và người dùng vẫn có thể bấm liên kết chuyển thẳng sang /tasks mà không bị chặn.',
  },
  {
    number: 'Câu 1 (Bài 2)',
    lab: 'Bài thực hành 2 — Mục 2.13',
    question: 'Dữ liệu nằm ở đâu sau khi tắt máy phát triển?',
    answer:
      'Sau khi tắt máy phát triển (dừng npm run dev), dữ liệu công việc nằm trong bảng public.tasks trên hệ quản trị cơ sở dữ liệu PostgreSQL của Supabase (trên đám mây: https://zoyxnbdvkjfjztktuxif.supabase.co). Nhờ đó dữ liệu được bảo toàn lâu dài và truy cập được từ cả localhost lẫn URL Vercel online.',
  },
  {
    number: 'Câu 2 (Bài 2)',
    lab: 'Bài thực hành 2 — Mục 2.13',
    question: 'Vì sao backend không nhận user_id từ form để xác định chủ sở hữu?',
    answer:
      'Mọi dữ liệu gửi từ trình duyệt (form hoặc JSON body) đều có thể bị người dùng chỉnh sửa bằng Developer Tools hoặc công cụ gửi request (curl, Postman). Nếu backend tin tưởng user_id gửi từ form, tài khoản B có thể điền user_id của tài khoản A để giả mạo chủ sở hữu. Vì vậy, backend bắt buộc phải xác minh Bearer token qua db.auth.getUser(token) và lấy auth.user.id từ kết quả xác thực đó.',
  },
  {
    number: 'Câu 3 (Bài 2)',
    lab: 'Bài thực hành 2 — Mục 2.13',
    question: 'RLS khác ẩn nút Sửa như thế nào?',
    answer:
      'Ẩn nút Sửa chỉ là biện pháp hiển thị ở giao diện (Frontend); kẻ tấn công vẫn có thể tự gửi lệnh PATCH/DELETE qua API hoặc gọi trực tiếp đến Supabase. Ngược lại, RLS (Row Level Security) là quy tắc bảo mật cưỡng chế ngay tại tầng cơ sở dữ liệu PostgreSQL: kiểm tra điều kiện (select auth.uid()) = user_id trên từng dòng dữ liệu trước khi cho phép đọc, thêm, sửa hoặc xóa.',
  },
  {
    number: 'Câu 4 (Bài 2)',
    lab: 'Bài thực hành 2 — Mục 2.13',
    question: 'Vì sao getSession phía trình duyệt chưa đủ để API tin người dùng?',
    answer:
      'getSession ở trình duyệt chỉ đọc phiên lưu cục bộ phía client để điều khiển giao diện. API ở phía server là điểm tiếp nhận độc lập và có thể bị gọi từ bất kỳ nguồn nào ngoài trình duyệt; do đó backend phải dùng authRequest gọi db.auth.getUser(token) để máy chủ Supabase Auth xác nhận token đó còn hiệu lực và không bị giả mạo.',
  },
  {
    number: 'Câu 5 (Bài 2)',
    lab: 'Bài thực hành 2 — Mục 2.13',
    question: 'Vì sao npm run build thành công chưa chứng minh phân quyền đúng?',
    answer:
      'Lệnh npm run build chỉ kiểm tra cú pháp, kiểu dữ liệu TypeScript và khả năng đóng gói ứng dụng. Nó hoàn toàn không kiểm tra logic nghiệp vụ hay chạy thử kịch bản tài khoản B truy cập trái phép dữ liệu của tài khoản A. Muốn chứng minh phân quyền đúng phải thực hiện kiểm thử tích hợp (T08–T11) với hai tài khoản A và B.',
  },
  {
    number: 'Câu 6 (Bài 2)',
    lab: 'Bài thực hành 2 — Mục 2.13',
    question: 'Sau khi đổi env trên Vercel cần làm gì?',
    answer:
      'Sau khi thay đổi hoặc bổ sung biến môi trường trên Vercel (đặc biệt là các biến có tiền tố NEXT_PUBLIC_), cần phải bấm Redeploy để Vercel thực hiện build lại ứng dụng và nạp giá trị biến môi trường mới vào bản chạy thực tế.',
  },
];

interface DeliverablesExplorerProps {
  mode: 'deliverables' | 'qa';
}

export const DeliverablesExplorer: React.FC<DeliverablesExplorerProps> = ({
  mode,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const [bugStep, setBugStep] = useState('Mục 2.8 — Nối giao diện với dữ liệu thật');
  const [bugPage, setBugPage] = useState('/tasks');
  const [bugAction, setBugAction] = useState('Nhấn nút Thêm công việc với tên "Ôn Next.js"');
  const [bugExpected, setBugExpected] = useState('API trả về HTTP 201 và danh sách hiển thị công việc mới');
  const [bugActual, setBugActual] = useState('API trả về HTTP 401 {"error": "Chưa đăng nhập"}');
  const [bugStatus, setBugStatus] = useState('401');

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(key);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  if (mode === 'qa') {
    const generatedBugTemplate = `Tôi đang ở bước [${bugStep}], trang [${bugPage}]. Tôi đã làm [${bugAction}]. Kết quả mong đợi [${bugExpected}], thực tế [${bugActual}]. HTTP status [${bugStatus}]. Log đã che token/mật khẩu [Authorization: Bearer <REDACTED>]. Hãy giải thích nguyên nhân dễ hiểu, chỉ rõ tệp cần sửa và cách kiểm tra lại. Không bỏ chức năng hoặc tắt RLS để tránh lỗi.`;

    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="pb-5 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">
                Mục 1.8 & Mục 2.13
              </span>
              <span aria-hidden="true">·</span>
              <span>Sinh viên: Tuấn Anh</span>
              <span aria-hidden="true">·</span>
              <span>9 Câu hỏi bảo vệ hiểu bài</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Trả lời câu hỏi kiểm tra hiểu bài (Bài 1 & Bài 2)
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Tổng hợp đầy đủ câu trả lời dành cho phần vấn đáp và báo cáo cuối khóa thực hành của sinh viên Tuấn Anh.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {QA_LIST.map((item) => (
              <div
                key={item.number}
                className="p-4 border border-slate-200 rounded-xl flex flex-col justify-between bg-slate-50/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-900">{item.number}</span>
                    <span>{item.lab}</span>
                  </div>
                  <h2 className="mt-2 text-sm font-bold text-slate-900 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                    <span>{item.question}</span>
                  </h2>
                  <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                    {item.answer}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      copyText(`${item.question}\nTrả lời: ${item.answer}`, item.number)
                    }
                    className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedPath === item.number ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép câu trả lời</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              Công cụ tạo Mẫu báo lỗi chuẩn gửi Claude Code (Mục 2.13)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Mô tả rõ bước làm, kết quả mong đợi, HTTP status và tự động che token/mật khẩu mà không tắt RLS.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label htmlFor="bug-step" className="block font-semibold text-slate-800 mb-1">
                Bước đang thực hiện
              </label>
              <input
                id="bug-step"
                type="text"
                value={bugStep}
                onChange={(e) => setBugStep(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="bug-page" className="block font-semibold text-slate-800 mb-1">
                Trang
              </label>
              <input
                id="bug-page"
                type="text"
                value={bugPage}
                onChange={(e) => setBugPage(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="bug-status" className="block font-semibold text-slate-800 mb-1">
                HTTP Status
              </label>
              <input
                id="bug-status"
                type="text"
                value={bugStatus}
                onChange={(e) => setBugStatus(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="bug-action" className="block font-semibold text-slate-800 mb-1">
                Thao tác đã làm
              </label>
              <input
                id="bug-action"
                type="text"
                value={bugAction}
                onChange={(e) => setBugAction(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="bug-expected" className="block font-semibold text-slate-800 mb-1">
                Kết quả mong đợi
              </label>
              <input
                id="bug-expected"
                type="text"
                value={bugExpected}
                onChange={(e) => setBugExpected(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bug-actual" className="block font-semibold text-slate-800 mb-1">
                Kết quả thực tế
              </label>
              <input
                id="bug-actual"
                type="text"
                value={bugActual}
                onChange={(e) => setBugActual(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span>{generatedBugTemplate}</span>
            <button
              type="button"
              onClick={() => copyText(generatedBugTemplate, 'bug-template')}
              className="h-9 px-3.5 bg-white text-slate-900 font-sans font-medium rounded-lg shrink-0 whitespace-nowrap cursor-pointer hover:bg-slate-100"
            >
              {copiedPath === 'bug-template' ? 'Đã sao chép mẫu' : 'Sao chép Prompt'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentFile = DELIVERABLE_FILES[selectedFileIndex];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="pb-5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">
              Bộ sản phẩm nộp Bài 1 & Bài 2
            </span>
            <span aria-hidden="true">·</span>
            <span>Sinh viên: Tuấn Anh</span>
            <span aria-hidden="true">·</span>
            <span>Supabase: {SUPABASE_URL}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Mã nguồn & Tệp cấu hình nộp bài của Tuấn Anh
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Đã đồng bộ hóa đầy đủ thông tin Supabase API của Tuấn Anh.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-1.5">
            {DELIVERABLE_FILES.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full p-3 text-left border rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                  selectedFileIndex === idx
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-xs font-semibold truncate">
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.path}</span>
                </div>
                <div
                  className={`mt-1 text-[11px] truncate ${
                    selectedFileIndex === idx ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {file.section}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 flex flex-col">
            <div className="p-4 border border-slate-200 rounded-t-xl bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs font-bold text-slate-900">
                  {currentFile.path}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {currentFile.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyText(currentFile.content, currentFile.path)}
                className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedPath === currentFile.path ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã sao chép tệp</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép nội dung</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-100 rounded-b-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[480px]">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
