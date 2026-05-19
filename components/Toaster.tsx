"use client";

import { useEffect, useState } from 'react';

export function Toaster() {
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  useEffect(() => {
    const handleToast = (e: CustomEvent<string>) => {
      setToast({ message: e.detail, visible: true });
      
      // Start fade out after 2.7s to complete at 3s
      setTimeout(() => {
        setToast(prev => prev ? { ...prev, visible: false } : null);
      }, 2700);

      // Remove from DOM after 3s
      setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    window.addEventListener('moonbeam-toast', handleToast as EventListener);
    return () => window.removeEventListener('moonbeam-toast', handleToast as EventListener);
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.visible ? 'visible' : 'hidden'}`}>
      {toast.message}
    </div>
  );
}
