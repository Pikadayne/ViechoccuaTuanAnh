-- Bài thực hành 2 - Mục 2.3: Tạo bảng công việc và phân quyền (Row Level Security)
-- Sinh viên thực hiện: Tuấn Anh
-- Dự án Supabase: https://zoyxnbdvkjfjztktuxif.supabase.co

create table public.tasks (
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
  using ((select auth.uid()) = user_id);
