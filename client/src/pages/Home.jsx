import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

function Home() {
  const { user, token, logout, setUser } = useAuth();
  const [partnerName, setPartnerName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Establish connection to Socket.IO server
    const socket = io(BACKEND_URL);

    // Log connection status to browser console
    socket.on('connect', () => {
      console.log('connected to server');
    });

    // Clean up socket connection on component unmount
    return () => {
      socket.disconnect();
    };
  }, []);

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
    navigate('/login');
  };

  if (!user) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid black' }}>
      <h2>Presence</h2>
      {error && <p style={{ color: 'black', fontWeight: 'bold' }}>Error: {error}</p>}
      
      <p style={{ fontSize: '18px', margin: '20px 0' }}>
        Connected with <strong>{partnerName || 'Loading partner...'}</strong>
      </p>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleUnpair} 
          style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid black', cursor: 'pointer' }}
        >
          Unpair
        </button>
        <button 
          onClick={handleLogout} 
          style={{ flex: 1, padding: '10px', background: 'white', border: '1px solid black', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Home;
