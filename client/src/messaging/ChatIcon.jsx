import React from 'react';
import './chat.css';

export default function ChatIcon({ unreadCount = 0, isOpen = false, onClick }) {
  return (
    <button
      className={`pm-icon-btn ${isOpen ? 'active' : ''}`}
      onClick={onClick}
      title={isOpen ? 'Close chat' : 'Open chat'}
      aria-label="Toggle chat"
      type="button"
    >
      {/* Speech bubble icon matching the reference screenshot */}
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01" strokeWidth="2.5" />
        <path d="M12 10h.01" strokeWidth="2.5" />
        <path d="M16 10h.01" strokeWidth="2.5" />
      </svg>

      {/* Red badge showing count of unread messages */}
      {unreadCount > 0 && (
        <span className="pm-badge" aria-label={`${unreadCount} unread messages`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
