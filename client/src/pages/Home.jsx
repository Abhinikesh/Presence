import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

function Home() {
  const { user, token, logout, setUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState('');
  const [myStatus, setMyStatus] = useState('Free');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Establish connection to Socket.IO server, passing token in handshake auth
    const socket = io(BACKEND_URL, {
      auth: {
        token: token
      }
    });

    socketRef.current = socket;

    // Log connection status to browser console
    socket.on('connect', () => {
      console.log('connected to server');
    });

    // Listen for partner's initial status on connect
    socket.on('partner_status', (data) => {
      setPartnerOnline(data.online);
      if (data.online) {
        setPartnerStatus(data.status || 'Free');
      }
    });

    // Listen for partner coming online
    socket.on('partner_online', (data) => {
      setPartnerOnline(true);
      setPartnerStatus(data?.status || 'Free');
    });

    // Listen for partner going offline
    socket.on('partner_offline', () => {
      setPartnerOnline(false);
    });

    // Listen for partner updating status
    socket.on('partner_status_update', (data) => {
      setPartnerStatus(data.status);
    });

    // Clean up socket connection on component unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const fetchPairStatus = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${BACKEND_URL}/api/pair/status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.paired) {
            setPartnerName(data.partner.name);
          } else {
            // If not paired, redirect to pair page
            navigate('/pair');
          }
        } else {
          setError('Failed to fetch pairing status');
        }
      } catch (err) {
        setError('Network error checking status');
      }
    };

    fetchPairStatus();
  }, [token, navigate]);

  const handleStatusChange = (status) => {
    setMyStatus(status);
    if (socketRef.current) {
      socketRef.current.emit('update_status', { status });
    }
  };

  const handleUnpair = async () => {
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/pair/unpair`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Clear pairing state in local context
        if (user) {
          setUser({ ...user, pairId: null });
        }
        navigate('/pair');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to unpair');
      }
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Loading...</div>;
  }

  return (
    <div className="page-top">
      <div className="card card-left">
        <h2>Presence</h2>
        {error && <div className="error-box">Error: {error}</div>}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: '500' }}>
            Connected with <strong>{partnerName || 'Loading partner...'}</strong>
          </span>
          <div className="status-indicator">
            <div className={`dot ${partnerOnline ? 'dot-online' : 'dot-offline'}`} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {partnerOnline ? `Online — ${partnerStatus}` : 'Offline'}
            </span>
          </div>
        </div>

        <p className="subtext" style={{ marginBottom: '8px' }}>
          You: <strong style={{ color: 'var(--text-primary)' }}>{myStatus}</strong>
        </p>

        <div className="btn-group mb-4">
          {['Free', 'Studying', 'Sleeping', 'Listening'].map((status) => {
            const isSelected = myStatus === status;
            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`btn-group-item ${isSelected ? 'selected' : ''}`}
              >
                {status}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button 
            onClick={handleUnpair} 
            className="btn"
            style={{ flex: 1 }}
          >
            Unpair
          </button>
          <button 
            onClick={handleLogout} 
            className="btn"
            style={{ flex: 1 }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
