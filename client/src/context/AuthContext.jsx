import React, { createContext, useContext, useState, useEffect } from 'react';
import { BACKEND_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  
  // Instant load: never block on splash screen if token and user are already cached!
  const [loading, setLoading] = useState(() => {
    const cachedToken = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('user');
    return !!(cachedToken && !cachedUser);
  });

  useEffect(() => {
    let cancelled = false;

    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      // Add a fast 6-second timeout so a cold backend never leaves the user hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
          }
        } else if (response.status === 401) {
          // Token is genuinely expired / invalid
          if (!cancelled) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
          console.warn('Background user profile refresh failed:', error.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMe();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
