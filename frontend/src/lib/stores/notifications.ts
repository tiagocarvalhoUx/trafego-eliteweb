import { writable } from 'svelte/store';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export const toasts = writable<Toast[]>([]);

export function addToast(type: Toast['type'], message: string, duration = 4000) {
  const id = Math.random().toString(36).slice(2);
  toasts.update((t) => [...t, { id, type, message }]);
  setTimeout(() => {
    toasts.update((t) => t.filter((toast) => toast.id !== id));
  }, duration);
}

export const toast = {
  success: (msg: string) => addToast('success', msg),
  error: (msg: string) => addToast('error', msg),
  info: (msg: string) => addToast('info', msg),
  warning: (msg: string) => addToast('warning', msg),
};
