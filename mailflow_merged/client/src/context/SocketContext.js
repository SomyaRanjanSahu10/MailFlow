import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user }           = useAuth();
  const socketRef          = useRef(null);
  const listenersRef       = useRef([]);
  const mentionListeners   = useRef([]);
  const importantListeners = useRef([]);
  const [notifications, setNotifications] = useState([]);
  const [notifCount,    setNotifCount]    = useState(0);

  useEffect(() => {
    if (!user) { socketRef.current?.disconnect(); socketRef.current = null; return; }
    const socket = io('http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('register', user.id));

    const push = (type, msg, email, extra = {}) => {
      setNotifications(p => [{ id: Date.now() + Math.random(), type, message: msg, email, timestamp: new Date(), ...extra }, ...p].slice(0, 25));
      setNotifCount(c => c + 1);
    };

    socket.on('new_email', email => {
      push('email', `📬 New email from ${email.sender?.name || 'someone'}: ${email.subject}`, email);
      listenersRef.current.forEach(cb => cb(email));
    });
    socket.on('mention', ({ email, mentionedBy }) => {
      push('mention', `🔔 ${mentionedBy} mentioned you in: ${email.subject}`, email);
      mentionListeners.current.forEach(cb => cb(email, mentionedBy));
    });
    socket.on('important_email', email => {
      push('important', `🔴 Important email from ${email.sender?.name}: ${email.subject}`, email);
      importantListeners.current.forEach(cb => cb(email));
    });

    return () => socket.disconnect();
  }, [user]);

  const clearNotifCount      = () => setNotifCount(0);
  const addListener          = cb => { listenersRef.current.push(cb);       return () => { listenersRef.current       = listenersRef.current.filter(l => l !== cb); }; };
  const addMentionListener   = cb => { mentionListeners.current.push(cb);   return () => { mentionListeners.current   = mentionListeners.current.filter(l => l !== cb); }; };
  const addImportantListener = cb => { importantListeners.current.push(cb); return () => { importantListeners.current = importantListeners.current.filter(l => l !== cb); }; };

  return (
    <SocketContext.Provider value={{ notifications, notifCount, clearNotifCount, addListener, addMentionListener, addImportantListener }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
