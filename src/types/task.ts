export interface Task {
  id: string;
  user_id?: string;
  title: string;
  is_done: boolean;
  created_at: string;
}

export type FilterStatus = 'all' | 'pending' | 'done';

export type ActiveRoute = '/tasks' | '/login' | '/defense';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roleLabel?: string;
}

export interface AuthSession {
  access_token: string;
  user: UserProfile;
}
