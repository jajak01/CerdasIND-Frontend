import api from './api';

export interface LoginResponse {
  message: string;
  data: {
    user_id: number;
    username: string;
    role: 'admin' | 'peserta';
    token: string;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
};
