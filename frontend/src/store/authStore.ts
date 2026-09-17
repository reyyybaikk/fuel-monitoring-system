import { create } from 'zustand';

interface UserProfile {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'ADMIN_PUSAT' | 'ADMIN' | 'MANAGER' | 'DRIVER';
  region?: string;
}

interface AuthState {
  userProfile: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userProfile: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,
  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
    set({ userProfile: user, accessToken: token, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    set({ userProfile: null, accessToken: null, isAuthenticated: false });
  },
}));
