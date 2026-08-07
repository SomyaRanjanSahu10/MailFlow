import React, { useState, useEffect, useCallback } from 'react';

// Global toast manager — import { toast } from './Toast' anywhere
let toastQueue = [];
let listeners  = [];

export const toast = {
  show: (msg, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    toastQueue = [...toastQueue, { id, msg, type }];
    listeners.forEach(fn => fn([...toastQueue]));
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      listeners.forEach(fn => fn([...toastQueue]));
    }, duration);
  },
  success: (msg, dur)  => toast.show(msg, 'success', dur),
  error:   (msg, dur)  => toast.show(msg, 'error',   dur || 4500),
  info:    (msg, dur)  => toast.show(msg, 'info',    dur),
  warning: (msg, dur)  => toast.show(msg, 'warning', dur),
};

const BG = { success:'#107c10', error:'#d13438', info:'#0078d4', warning:'#ca5010' };
const IC = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (t) => setToasts(t);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:9999,
      display:'flex', flexDirection:'column', gap:'8px', maxWidth:'380px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: BG[t.type] || BG.info,
          color:'white', padding:'12px 18px', borderRadius:'8px',
          fontSize:'14px', fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,0.25)',
          display:'flex', alignItems:'center', gap:'10px',
          animation:'slideUp 0.25s ease',
        }}>
          <span style={{ fontSize:'16px' }}>{IC[t.type]}</span>
          <span style={{ flex:1 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
