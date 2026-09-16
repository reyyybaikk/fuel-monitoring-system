import api from './api';

export interface LoginResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: 'ADMIN' | 'DRIVER';
    region?: string;
  };
  token: string;
}

export const loginToBackend = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data.data;
};
