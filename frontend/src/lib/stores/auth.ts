import { writable } from 'svelte/store';

interface User {
  id: number;
  nome: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export const authStore = writable<AuthState>({
  user: null,
  token: null,
  loading: true,
});

export function isAuthenticated(state: AuthState): boolean {
  return !!state.token && !!state.user;
}
