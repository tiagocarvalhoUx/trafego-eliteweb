import api from './api';
import { authStore } from '../stores/auth';

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post('/auth/login', payload);
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      authStore.set({ user: data.data.user, token: data.data.token, loading: false });
    }
    return data;
  },

  async register(payload: RegisterPayload) {
    const { data } = await api.post('/auth/register', payload);
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      authStore.set({ user: data.data.user, token: data.data.token, loading: false });
    }
    return data;
  },

  async loadUser() {
    const token = localStorage.getItem('token');
    if (!token) {
      authStore.set({ user: null, token: null, loading: false });
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      authStore.set({ user: data.data, token, loading: false });
    } catch {
      localStorage.removeItem('token');
      authStore.set({ user: null, token: null, loading: false });
    }
  },

  logout() {
    localStorage.removeItem('token');
    authStore.set({ user: null, token: null, loading: false });
    window.location.href = '/login';
  },
};
