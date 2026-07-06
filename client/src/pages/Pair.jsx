import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../config';

function Pair() {
  const [partnerCode, setPartnerCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { user, token, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already paired, redirect to home immediately
    if (user && user.pairId) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleCopy = () => {
    if (user && user.pairCode) {
      navigator.clipboard.writeText(user.pairCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = partnerCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a partner code');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/pair/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pairCode: cleanCode })
      });

      const data = await response.json();

      if (response.ok) {
        // Update user context with partner id
        if (user) {
          setUser({ ...user, pairId: data.partner.id });
        }
        navigate('/home');
      } else {
        setError(data.error || 'Connection failed');
      }
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  if (!user) {
    return <div style={{ textAlign: 'center', marginTop: '40px' }}>Loading...</div>;
  }

  return (
    <div className="page-center">
      <h2 style={{ marginBottom: '12px' }}>Connect with a Partner</h2>
      
      <div className="card">
        <p style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>Your Pair Code</p>
        <div style={{ fontSize: '2.5rem', fontWeight: '700', margin: '16px 0', letterSpacing: '4px', color: 'var(--text-primary)' }}>
          {user.pairCode}
        </div>
        <button 
          onClick={handleCopy} 
          className="btn"
          style={{ width: 'auto', padding: '8px 16px', display: 'inline-flex' }}
        >
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>

      <div className="card">
        <form onSubmit={handleConnect}>
          <h3 style={{ marginBottom: '16px' }}>Enter Partner's Code</h3>
          {error && <div className="error-box">Error: {error}</div>}
          <div className="form-group mt-2">
            <input
              type="text"
              placeholder="Partner's 6-character code"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              className="input-text"
              maxLength={6}
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary mt-3"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

export default Pair;
