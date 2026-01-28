'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#2a2a2a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ededed',
          borderRadius: '12px',
        },
        classNames: {
          success: 'toast-success',
          error: 'toast-error',
          warning: 'toast-warning',
          info: 'toast-info',
        },
      }}
      theme="dark"
      richColors
      closeButton
      expand
    />
  );
}

export { toast } from 'sonner';
