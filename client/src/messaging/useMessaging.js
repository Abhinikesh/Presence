import { useState, useEffect, useRef, useCallback } from 'react';
import { BACKEND_URL } from '../config';

export function useMessaging({ socket, isConnected, token, currentUser, partner, isChatOpen }) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Mark all unread messages as read
  const markAsRead = useCallback(async () => {
    if (!token) return;
    try {
      setUnreadCount(0);
      if (socket && (socket.connected || isConnected)) {
        socket.emit('chat_mark_read');
      }
      await fetch(`${BACKEND_URL}/api/messages/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.recipient === (currentUser?._id || currentUser?.id)
            ? { ...msg, read: true }
            : msg
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [socket, token, currentUser]);

  // When chat opens, immediately mark unread messages as read
  useEffect(() => {
    if (isChatOpen) {
      markAsRead();
    }
  }, [isChatOpen, markAsRead]);

  // Fetch initial messages and unread count
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    async function fetchData() {
      setLoading(true);
      try {
        const [msgsRes, unreadRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${BACKEND_URL}/api/messages/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (msgsRes.ok) {
          const msgsData = await msgsRes.json();
          if (isMounted) setMessages(msgsData.messages || []);
        }

        if (unreadRes.ok) {
          const unreadData = await unreadRes.json();
          if (isMounted) setUnreadCount(unreadData.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to load messages or unread count:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });

      if (isChatOpenRef.current) {
        // Chat is open, mark read immediately
        markAsRead();
      } else {
        // Chat is closed, increment unread badge counter
        setUnreadCount((count) => count + 1);
      }
    };

    const handleMessageSent = (sentMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === sentMsg._id)) return prev;
        return [...prev, sentMsg];
      });
    };

    const handleMessagesRead = () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === (currentUser?._id || currentUser?.id)
            ? { ...msg, read: true }
            : msg
        )
      );
    };

    const handlePartnerTyping = ({ isTyping }) => {
      setIsPartnerTyping(isTyping);
    };

    socket.on('chat_receive_message', handleReceiveMessage);
    socket.on('chat_message_sent', handleMessageSent);
    socket.on('chat_messages_read', handleMessagesRead);
    socket.on('chat_partner_typing', handlePartnerTyping);

    return () => {
      socket.off('chat_receive_message', handleReceiveMessage);
      socket.off('chat_message_sent', handleMessageSent);
      socket.off('chat_messages_read', handleMessagesRead);
      socket.off('chat_partner_typing', handlePartnerTyping);
    };
  }, [socket, isConnected, markAsRead, currentUser]);

  const sendMessage = useCallback((text) => {
    if (!text || !text.trim() || !socket) return;
    socket.emit('chat_send_message', { text: text.trim() });
  }, [socket]);

  const sendTyping = useCallback((isTyping) => {
    if (!socket) return;
    socket.emit('chat_typing', { isTyping });
  }, [socket]);

  return {
    messages,
    unreadCount,
    isPartnerTyping,
    loading,
    sendMessage,
    sendTyping,
    markAsRead
  };
}
