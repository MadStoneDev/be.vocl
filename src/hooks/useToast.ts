import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const showToast = (
    type: ToastType,
    message: string,
    options?: ToastOptions
  ) => {
    const toastFn = {
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
    }[type];

    toastFn(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  };

  return {
    success: (message: string, options?: ToastOptions) =>
      showToast('success', message, options),
    error: (message: string, options?: ToastOptions) =>
      showToast('error', message, options),
    info: (message: string, options?: ToastOptions) =>
      showToast('info', message, options),
    warning: (message: string, options?: ToastOptions) =>
      showToast('warning', message, options),
    promise: toast.promise,
    dismiss: toast.dismiss,
  };
}

// Pre-built toast messages for common actions
export const toastMessages = {
  post: {
    created: 'Post created successfully',
    deleted: 'Post deleted',
    queued: 'Added to queue',
    scheduled: 'Post scheduled',
    pinned: 'Post pinned to profile',
    unpinned: 'Post unpinned',
  },
  follow: {
    followed: (username: string) => `Following @${username}`,
    unfollowed: (username: string) => `Unfollowed @${username}`,
  },
  profile: {
    updated: 'Profile updated',
    avatarUpdated: 'Profile picture updated',
  },
  auth: {
    loggedIn: 'Welcome back!',
    loggedOut: 'Logged out successfully',
    magicLinkSent: 'Check your email for the magic link',
  },
  error: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your connection.',
    unauthorized: 'Please log in to continue.',
    notFound: 'Content not found.',
  },
  copy: {
    link: 'Link copied to clipboard',
    text: 'Copied to clipboard',
  },
};
