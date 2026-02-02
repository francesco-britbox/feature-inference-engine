/**
 * Toast Notification Hook
 * Provides a centralized toast notification system using Zustand
 */

import { create } from 'zustand';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

/**
 * Toast store using Zustand
 */
const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));

/**
 * Main toast hook
 * Provides functions to show toast notifications
 */
export function useToast() {
  const { addToast, removeToast, clearAll, toasts } = useToastStore();

  return {
    toasts,
    toast: {
      success: (message: string, title?: string, duration?: number) =>
        addToast({ message, title, type: 'success', duration }),

      error: (message: string, title?: string, duration?: number) =>
        addToast({ message, title, type: 'error', duration }),

      warning: (message: string, title?: string, duration?: number) =>
        addToast({ message, title, type: 'warning', duration }),

      info: (message: string, title?: string, duration?: number) =>
        addToast({ message, title, type: 'info', duration }),
    },
    removeToast,
    clearAll,
  };
}

/**
 * Convenience hook to access toast store directly
 */
export { useToastStore };
