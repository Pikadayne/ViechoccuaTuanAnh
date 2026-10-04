# Quy tắc dự án (CLAUDE.md) — Việc học của tôi
- **Sinh viên thực hiện**: Tuấn Anh
- **Cấu hình**: Đọc từ biến môi trường `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Quy tắc bắt buộc:
1. Luôn xác minh Bearer token ở backend qua authRequest và kiểm tra quyền trên từng dòng (RLS).
2. Không in mật khẩu hoặc token người dùng vào log hay console.
3. Không để lộ key hoặc URL nhạy cảm trong mã nguồn công khai.
4. Mọi thay đổi phải vượt qua `tsc --noEmit` và `vite build`.
