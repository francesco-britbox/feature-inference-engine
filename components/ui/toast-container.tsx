/**
 * Toast Container Component
 * Displays toast notifications using the useToast hook
 */

'use client';

import { useToast } from '@/lib/hooks/useToast';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ToastContainer(): JSX.Element {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return <></>;
  }

  const getIcon = (type: string): JSX.Element => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: string): 'default' | 'destructive' => {
    return type === 'error' ? 'destructive' : 'default';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          variant={getVariant(toast.type)}
          className="relative shadow-lg"
        >
          <div className="flex items-start gap-2">
            {getIcon(toast.type)}
            <div className="flex-1">
              {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
              <AlertDescription>{toast.message}</AlertDescription>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute top-2 right-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
