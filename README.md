# Tuan Anh’s Task Manager (Việc học của tôi)

Ứng dụng quản lý công việc học tập cá nhân bảo vệ bằng Supabase Authentication và Row Level Security (RLS).

- **Sinh viên thực hiện**: **Tuấn Anh**

## Cấu hình môi trường (.env)
Tạo file `.env` hoặc cấu hình trong môi trường hosting:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

## Cài đặt và khởi chạy
```bash
npm install
npm run dev
```

Truy cập tại: `http://localhost:3000`
- `/login`: Đăng nhập với tài khoản thử nghiệm
- `/tasks`: Quản lý công việc cá nhân có xác thực phân quyền
- `/defense`: Ôn tập 9 câu hỏi bảo vệ bài thực hành
