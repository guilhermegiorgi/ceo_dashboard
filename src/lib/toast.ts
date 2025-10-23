import toast from 'react-hot-toast';

export const showSuccessToast = (message: string, options?: { duration?: number }) => {
  return toast.success(message, {
    duration: options?.duration ?? 3000,
    style: {
      background: '#18181b',
      color: '#fafafa',
      border: '1px solid #27272a',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      padding: '12px 16px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#10b981',
      secondary: '#18181b',
    },
  });
};

export const showErrorToast = (message: string, options?: { duration?: number }) => {
  return toast.error(message, {
    duration: options?.duration ?? 4000,
    style: {
      background: '#18181b',
      color: '#fafafa',
      border: '1px solid #3f3f46',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      padding: '12px 16px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#18181b',
    },
  });
};

export const showInfoToast = (message: string, options?: { duration?: number }) => {
  return toast(message, {
    duration: options?.duration ?? 3000,
    icon: '💡',
    style: {
      background: '#18181b',
      color: '#fafafa',
      border: '1px solid #27272a',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '500',
      padding: '12px 16px',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  });
};
