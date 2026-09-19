import React, { useState, useEffect, useRef } from 'react';
import './chat.css';

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatBox({
  partnerName,
  partnerOnline,
  currentUser,
  messages = [],
  isPartnerTyping = false,
  onSendMessage,
  onSendTyping,
  onClose
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (onSendTyping) {
      onSendTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onSendTyping(false);
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (onSendTyping) onSendTyping(false);

    onSendMessage(inputText.trim());
    setInputText('');
  };

  const currentUserId = currentUser?._id || currentUser?.id;
  const partnerInitial = (partnerName || 'P').charAt(0).toUpperCase();

  return (
    <div className="pm-popover" role="dialog" aria-label="Direct Chat">
      {/* Header */}
      <div className="pm-header">
        <div className="pm-header-user">
          <div className="pm-avatar">{partnerInitial}</div>
          <div className="pm-header-info">
            <span className="pm-header-name">{partnerName || 'Partner'}</span>
            <span className="pm-header-status">
              <span className={`pm-status-dot ${partnerOnline ? 'online' : ''}`} />
              {partnerOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="pm-header-actions">
          <button
            type="button"
            className="pm-header-btn"
            onClick={onClose}
            title="Close chat"
            aria-label="Close chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Body */}
      <div className="pm-body">
        <div className="pm-date-chip">Today</div>

        {messages.length === 0 ? (
          <div className="pm-empty">
            <div className="pm-empty-icon">💬</div>
            <div className="pm-empty-title">Say hello to {partnerName || 'your partner'}!</div>
            <div className="pm-empty-desc">
              Your messages are real-time, private, and securely encrypted.
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSent = String(msg.sender) === String(currentUserId);

            return (
              <div
                key={msg._id || index}
                className={`pm-msg ${isSent ? 'pm-msg-sent' : 'pm-msg-received'}`}
              >
                <div className="pm-bubble">
                  <div className="pm-msg-text">{msg.text}</div>
                  <div className="pm-msg-meta">
                    <span>{formatTime(msg.createdAt)}</span>
                    {isSent && (
                      <span className={`pm-ticks ${msg.read ? 'read' : ''}`}>
                        {msg.read ? (
                          // Double checkmark (read)
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 6 9 17 4 12" />
                            <polyline points="22 10 13 21 11 19" />
                          </svg>
                        ) : (
                          // Single checkmark (sent)
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Partner Typing Bubble */}
        {isPartnerTyping && (
          <div className="pm-typing-bubble" title={`${partnerName || 'Partner'} is typing`}>
            <div className="pm-typing-dot" />
            <div className="pm-typing-dot" />
            <div className="pm-typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="pm-footer">
        <form className="pm-form" onSubmit={handleSend}>
          <input
            ref={inputRef}
            type="text"
            className="pm-input"
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="pm-send-btn"
            disabled={!inputText.trim()}
            title="Send message"
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
