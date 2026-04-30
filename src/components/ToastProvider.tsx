import { useState, useCallback, ReactNode } from 'react';
import { Toast } from '../types';
import { ToastContext } from '../hooks/useToast';

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type']) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2);
      const toast: Toast = { id, message, type };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        removeToast(id);
      }, 3000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}
