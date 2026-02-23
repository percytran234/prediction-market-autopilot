import React, { useState, useEffect, useCallback } from 'react';

let toastIdCounter = 0;
let globalAddToast = null;

// External API: call addToast() from anywhere
export function addToast(message, type = 'info') {
  if (globalAddToast) globalAddToast(message, type);
}

const COLORS = {
  win: { bg: 'bg-accent-green/15', border: 'border-accent-green/30', text: 'text-accent-green', icon: '\u2713' },
  loss: { bg: 'bg-accent-red/15', border: 'border-accent-red/30', text: 'text-accent-red', icon: '\u2717' },
  info: { bg: 'bg-accent-blue/15', border: 'border-accent-blue/30', text: 'text-accent-blue', icon: '\u25B6' },
  warning: { bg: 'bg-accent-yellow/15', border: 'border-accent-yellow/30', text: 'text-accent-yellow', icon: '\u26A0' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    globalAddToast = add;
    return () => { globalAddToast = null; };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-6 z-50 space-y-2 pointer-events-none" style={{ maxWidth: 320 }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info;
        return (
          <div key={t.id}
            className={`pointer-events-auto ${c.bg} ${c.border} border rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-lg animate-toast-in`}
          >
            <span className={`text-sm ${c.text}`}>{c.icon}</span>
            <span className={`text-xs font-mono font-semibold ${c.text}`}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
