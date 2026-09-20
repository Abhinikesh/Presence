import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import './NotificationBanner.css';

const NotificationContext = createContext(null);

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle melodic double chime (C6 -> G6)
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
    osc.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.08); // G6

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (_) {}
}

export function NotificationProvider({ children }) {
  const [activeNotif, setActiveNotif] = useState(null);
  const timerRef = useRef(null);

  const dismissNotification = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveNotif((prev) => (prev ? { ...prev, exiting: true } : null));
    setTimeout(() => {
      setActiveNotif(null);
    }, 250);
  }, []);

  const showNotification = useCallback((notif) => {
    if (!notif) return;

    // Web Notification API (when tab is minimized / backgrounded)
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(notif.title || 'Presence', {
            body: notif.message,
            icon: '/logo.png'
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch (_) {}

    // Play subtle chime sound
    playNotificationChime();

    if (timerRef.current) clearTimeout(timerRef.current);

    const fullNotif = {
      id: notif.id || Date.now(),
      type: notif.type || 'message',
      title: notif.title || 'Presence',
      message: notif.message || '',
      avatarText: notif.avatarText || 'P',
      onClick: notif.onClick,
      exiting: false
    };

    setActiveNotif(fullNotif);

    timerRef.current = setTimeout(() => {
      dismissNotification();
    }, notif.duration || 5000);
  }, [dismissNotification]);

  const handleCardClick = () => {
    if (activeNotif?.onClick) {
      activeNotif.onClick();
    }
    dismissNotification();
  };

  return (
    <NotificationContext.Provider value={{ showNotification, dismissNotification }}>
      {children}

      {activeNotif && (
        <div className="pm-notif-container" role="status" aria-live="polite">
          <div
            className={`pm-notif-card ${activeNotif.exiting ? 'exiting' : ''}`}
            onClick={handleCardClick}
          >
            {/* Avatar with type badge */}
            <div className="pm-notif-avatar-wrap">
              <div className={`pm-notif-avatar ${activeNotif.type === 'music' ? 'music-avatar' : ''}`}>
                {activeNotif.type === 'music' ? '🎵' : activeNotif.avatarText}
              </div>
              <span className={`pm-notif-badge-icon ${activeNotif.type === 'music' ? 'music-badge' : ''}`}>
                {activeNotif.type === 'music' ? '▶' : '💬'}
              </span>
            </div>

            {/* Content info */}
            <div className="pm-notif-content">
              <div className="pm-notif-top">
                <span className="pm-notif-title">{activeNotif.title}</span>
                <span className="pm-notif-time">now</span>
              </div>
              <div className="pm-notif-msg">{activeNotif.message}</div>
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              className="pm-notif-close"
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification();
              }}
              title="Dismiss"
              aria-label="Dismiss notification"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return { showNotification: () => {}, dismissNotification: () => {} };
  }
  return ctx;
}
