"use client";

// Simple toast implementation
import { useState, useEffect } from 'react';

interface ToastOptions {
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
}

let toastId = 0;

// Context to manage toast state
export const useToast = () => {
  const [toasts, setToasts] = useState<{
    id: number;
    title?: string;
    description: string;
    variant: 'default' | 'destructive';
  }[]>([]);
  
  const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
    const id = toastId++;
    setToasts((toasts) => [...toasts, { id, title, description, variant }]);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts((toasts) => toasts.filter((t) => t.id !== id));
    }, 3000);
    
    return id;
  };
  
  return { toast, toasts };
};

// Toast component
export function Toaster() {
  const { toasts } = useToast();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`p-4 rounded-md shadow-md ${
            toast.variant === 'destructive' ? 'bg-red-600 text-white' : 'bg-white border border-gray-200'
          }`}
        >
          {toast.title && <div className="font-semibold">{toast.title}</div>}
          <div>{toast.description}</div>
        </div>
      ))}
    </div>
  );
}
