import { createClient } from '@supabase/supabase-js';

// Đọc trực tiếp biến chuẩn Next.js (Mục 2.2)
export const SUPABASE_URL =
  import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  import.meta.env?.VITE_SUPABASE_URL ||
  'https://zoyxnbdvkjfjztktuxif.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_PGvgMRdRAzW3bO43bF2sbg_M7HFy10n';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
