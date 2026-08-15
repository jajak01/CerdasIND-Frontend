import api from './api';

type UserRole = 'admin' | 'peserta';

export interface LoginResponse {
  message: string;
  data: {
    user_id: number;
    username: string;
    role: UserRole;
    token: string;
  };
}

type RawLoginResponse = {
  message?: string;
  data?: {
    user_id?: number | string;
    id?: number | string;
    username?: string;
    role?: string;
    token?: string;
    user?: {
      user_id?: number | string;
      id?: number | string;
      username?: string;
      role?: string;
    };
  };
  user_id?: number | string;
  id?: number | string;
  username?: string;
  role?: string;
  token?: string;
  user?: {
    user_id?: number | string;
    id?: number | string;
    username?: string;
    role?: string;
  };
};

const normalizeRole = (value: unknown): UserRole | null => {
  const role = String(value || '').toLowerCase();
  return role === 'admin' || role === 'peserta' ? role : null;
};

const normalizeLoginResponse = (payload: RawLoginResponse): LoginResponse => {
  const data = payload.data || payload;
  const user = data.user || payload.user || data;
  const token = data.token || payload.token || '';
  const rawUserId = user.user_id ?? user.id ?? data.user_id ?? data.id;
  const userId = typeof rawUserId === 'number' ? rawUserId : Number(rawUserId);
  const username = user.username || data.username || '';
  const role = normalizeRole(user.role || data.role);

  if (!token || !Number.isFinite(userId) || !username || !role) {
    throw new Error('Response login dari server tidak lengkap.');
  }

  return {
    message: payload.message || 'Login berhasil',
    data: {
      token,
      user_id: userId,
      username,
      role,
    },
  };
};

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<RawLoginResponse>('/auth/login', { email, password });
    return normalizeLoginResponse(response.data);
  },

  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
};
