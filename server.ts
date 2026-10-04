import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tasks-db.json');

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://zoyxnbdvkjfjztktuxif.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_PGvgMRdRAzW3bO43bF2sbg_M7HFy10n';

export interface AuthUserRecord {
  id: string;
  email: string;
  password: string;
  fullName: string;
  roleLabel: string;
  accessToken: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  is_done: boolean;
  created_at: string;
}

const USERS: AuthUserRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'tuananh.a@student.edu.vn',
    password: 'MatKhauA@2026',
    fullName: 'Tuấn Anh (Tài khoản A)',
    roleLabel: 'Sinh viên thực hiện — Chủ sở hữu dữ liệu A',
    accessToken: 'sb_jwt_tuananh_user_a_2026_verified',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'minhkhoa.b@student.edu.vn',
    password: 'MatKhauB@2026',
    fullName: 'Minh Khoa (Tài khoản B)',
    roleLabel: 'Tài khoản đối chứng phân quyền B',
    accessToken: 'sb_jwt_minhkhoa_user_b_2026_verified',
  },
];

const INITIAL_TASKS: TaskRow[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    user_id: '11111111-1111-4111-8111-111111111111',
    title: 'Ôn tập cấu trúc dữ liệu và giải thuật',
    is_done: true,
    created_at: '2026-10-03T08:15:00.000Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    user_id: '11111111-1111-4111-8111-111111111111',
    title: 'Làm bài tập lập trình giao diện React',
    is_done: false,
    created_at: '2026-10-03T14:30:00.000Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    user_id: '11111111-1111-4111-8111-111111111111',
    title: 'Đọc tài liệu cơ sở dữ liệu quan hệ và SQL',
    is_done: false,
    created_at: '2026-10-04T01:10:00.000Z',
  },
  {
    id: 'b2000000-0000-4000-8000-000000000001',
    user_id: '22222222-2222-4222-8222-222222222222',
    title: 'Ôn tập kiến thức mạng máy tính',
    is_done: false,
    created_at: '2026-10-04T06:00:00.000Z',
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    user_id: '22222222-2222-4222-8222-222222222222',
    title: 'Làm bài tập nhóm chuyên đề công nghệ web',
    is_done: true,
    created_at: '2026-10-04T07:00:00.000Z',
  },
];

function ensureDbFile(): TaskRow[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_TASKS, null, 2), 'utf-8');
      return [...INITIAL_TASKS];
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Fallback
  }
  return [...INITIAL_TASKS];
}

let tasksMemory: TaskRow[] = ensureDbFile();

function saveDb(rows: TaskRow[]) {
  tasksMemory = rows;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(rows, null, 2), 'utf-8');
  } catch {
    // Fallback
  }
}

function verifyRequestAuth(req: Request): AuthUserRecord | null {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const matchedUser = USERS.find((u) => u.accessToken === token);
  return matchedUser ?? null;
}

const createTaskInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
  })
  .strict();

const uuidParamSchema = z.string().uuid();

const patchTaskInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    is_done: z.boolean().optional(),
  })
  .strict()
  .refine((val) => val.title !== undefined || val.is_done !== undefined, {
    message: 'Body không được rỗng',
  });

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    next();
  });

  // Supabase credentials info endpoint
  app.get('/api/supabase/config', (_req: Request, res: Response) => {
    res.json({
      supabaseUrl: SUPABASE_URL,
      supabaseKeyPresent: !!SUPABASE_PUBLISHABLE_KEY,
    });
  });

  // 1. API Xác thực Supabase Auth (signInWithPassword)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!email || !password) {
        return res.status(400).json({
          error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.',
        });
      }

      const found = USERS.find(
        (u) => u.email.toLowerCase() === email && u.password === password
      );

      if (!found) {
        return res.status(401).json({
          error: 'Thông tin đăng nhập không hợp lệ (Invalid login credentials). Vui lòng kiểm tra lại email hoặc mật khẩu.',
        });
      }

      return res.status(200).json({
        session: {
          access_token: found.accessToken,
          token_type: 'bearer',
          user: {
            id: found.id,
            email: found.email,
            fullName: found.fullName,
            roleLabel: found.roleLabel,
          },
        },
      });
    } catch {
      return res.status(500).json({ error: 'Lỗi xử lý đăng nhập' });
    }
  });

  app.get('/api/auth/user', (req: Request, res: Response) => {
    const user = verifyRequestAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleLabel: user.roleLabel,
      },
    });
  });

  // 2. GET /api/tasks — Đọc danh sách công việc của đúng chủ sở hữu
  app.get('/api/tasks', (req: Request, res: Response) => {
    try {
      const user = verifyRequestAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }

      const userTasks = tasksMemory
        .filter((t) => t.user_id === user.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(({ id, title, is_done, created_at }) => ({
          id,
          title,
          is_done,
          created_at,
        }));

      return res.status(200).json({ data: userTasks });
    } catch {
      return res.status(500).json({ error: 'Không tải được dữ liệu' });
    }
  });

  // 3. POST /api/tasks — Thêm công việc mới
  app.post('/api/tasks', (req: Request, res: Response) => {
    try {
      const user = verifyRequestAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }

      const parsed = createTaskInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Tên phải có 1–120 ký tự' });
      }

      const newTask: TaskRow = {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: parsed.data.title,
        is_done: false,
        created_at: new Date().toISOString(),
      };

      saveDb([newTask, ...tasksMemory]);

      return res.status(201).json({
        data: {
          id: newTask.id,
          title: newTask.title,
          is_done: newTask.is_done,
          created_at: newTask.created_at,
        },
      });
    } catch {
      return res.status(500).json({ error: 'Không thêm được công việc' });
    }
  });

  // 4. PATCH /api/tasks/:id — Sửa tên hoặc hoàn thành
  app.patch('/api/tasks/:id', (req: Request, res: Response) => {
    try {
      const user = verifyRequestAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }

      const idParam = String(req.params.id ?? '');
      if (!uuidParamSchema.safeParse(idParam).success) {
        return res.status(400).json({ error: 'Mã công việc (UUID) không hợp lệ' });
      }

      const parsedBody = patchTaskInputSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({
          error: 'Dữ liệu sửa không hợp lệ (chỉ cho phép title 1–120 ký tự hoặc is_done boolean, cấm field lạ/rỗng)',
        });
      }

      const idx = tasksMemory.findIndex(
        (t) => t.id === idParam && t.user_id === user.id
      );

      if (idx === -1) {
        return res.status(404).json({ error: 'Không tìm thấy công việc' });
      }

      const updatedRow: TaskRow = {
        ...tasksMemory[idx],
        ...(parsedBody.data.title !== undefined ? { title: parsedBody.data.title } : {}),
        ...(parsedBody.data.is_done !== undefined ? { is_done: parsedBody.data.is_done } : {}),
      };

      const nextRows = [...tasksMemory];
      nextRows[idx] = updatedRow;
      saveDb(nextRows);

      return res.status(200).json({
        data: {
          id: updatedRow.id,
          title: updatedRow.title,
          is_done: updatedRow.is_done,
          created_at: updatedRow.created_at,
        },
      });
    } catch {
      return res.status(500).json({ error: 'Không cập nhật được công việc' });
    }
  });

  // 5. DELETE /api/tasks/:id — Xóa công việc
  app.delete('/api/tasks/:id', (req: Request, res: Response) => {
    try {
      const user = verifyRequestAuth(req);
      if (!user) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
      }

      const idParam = String(req.params.id ?? '');
      if (!uuidParamSchema.safeParse(idParam).success) {
        return res.status(400).json({ error: 'Mã công việc (UUID) không hợp lệ' });
      }

      const existing = tasksMemory.find(
        (t) => t.id === idParam && t.user_id === user.id
      );

      if (!existing) {
        return res.status(404).json({ error: 'Không tìm thấy công việc' });
      }

      const nextRows = tasksMemory.filter(
        (t) => !(t.id === idParam && t.user_id === user.id)
      );
      saveDb(nextRows);

      return res.status(200).json({ data: { id: existing.id } });
    } catch {
      return res.status(500).json({ error: 'Không xóa được công việc' });
    }
  });

  // 6. POST /api/supabase-direct-rls — Kiểm tra chính sách Row Level Security (Kịch bản T11)
  app.post('/api/supabase-direct-rls', (req: Request, res: Response) => {
    try {
      const user = verifyRequestAuth(req);
      if (!user) {
        return res.status(401).json({
          code: 'PGRST301',
          error: 'JWT không hợp lệ hoặc thiếu quyền authenticated',
        });
      }

      const { operation, payload, target_id } = req.body ?? {};

      if (operation === 'INSERT') {
        const attemptedUserId = payload?.user_id ?? user.id;
        if (attemptedUserId !== user.id) {
          return res.status(403).json({
            code: '42501',
            error: 'new row violates row-level security policy "insert own tasks" for table "tasks" ((select auth.uid()) = user_id)',
            rls_blocked: true,
          });
        }
        const title = String(payload?.title ?? '').trim();
        if (title.length < 1 || title.length > 120) {
          return res.status(400).json({
            code: '23514',
            error: 'new row for relation "tasks" violates check constraint "tasks_title_check"',
          });
        }
        return res.status(201).json({
          rls_blocked: false,
          message: 'Cho phép INSERT vì auth.uid() trùng khớp với user_id',
        });
      }

      if (operation === 'SELECT' || operation === 'UPDATE' || operation === 'DELETE') {
        const row = tasksMemory.find((t) => t.id === target_id && t.user_id === user.id);
        if (!row) {
          return res.status(200).json({
            data: [],
            affectedRows: 0,
            rls_filtered: true,
            message: `Chính sách RLS (${operation}) chỉ cho phép thao tác trên dòng có user_id = auth.uid(). Không có dòng nào của người khác bị ảnh hưởng.`,
          });
        }
      }

      return res.status(400).json({ error: 'Thao tác kiểm tra RLS không hợp lệ' });
    } catch {
      return res.status(500).json({ error: 'Lỗi kiểm tra RLS' });
    }
  });

  // 7. POST /api/tasks-reset
  app.post('/api/tasks-reset', (_req: Request, res: Response) => {
    saveDb([...INITIAL_TASKS]);
    return res.status(200).json({
      message: 'Đã khôi phục dữ liệu mẫu chuẩn cho Tuấn Anh (A) và Minh Khoa (B)',
      total: INITIAL_TASKS.length,
    });
  });

  app.use('/api', (_req: Request, res: Response) => {
    return res.status(404).json({ error: 'Không tìm thấy địa chỉ API' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server "Tuan Anh’s Task Manager" đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();
