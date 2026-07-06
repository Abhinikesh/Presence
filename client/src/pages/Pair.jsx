import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

    try {
      const response = await fetch('http://localhost:5000/api/pair/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pairCode: partnerCode })
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
    <div style={{ maxWidth: '400px', margin: '40px auto' }}>
      <h2>Connect with a Partner</h2>
      
      <div style={{ padding: '20px', border: '1px solid black', marginBottom: '20px' }}>
        <p>Your Pair Code:</p>
        <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0', letterSpacing: '2px' }}>
          {user.pairCode}
        </div>
        <button 
          onClick={handleCopy} 
          style={{ padding: '5px 10px', background: 'white', border: '1px solid black', cursor: 'pointer' }}
        >
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>

      <form onSubmit={handleConnect} style={{ padding: '20px', border: '1px solid black' }}>
        <h3>Enter Partner's Code</h3>
        {error && <p style={{ color: 'black', fontWeight: 'bold' }}>Error: {error}</p>}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Partner's 6-character code"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid black', boxSizing: 'border-box' }}
            maxLength={6}
            required
          />
        </div>
        <button 
          type="submit" 
          style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid black', cursor: 'pointer' }}
        >
          Connect
        </button>
      </form>
    </div>
  );
}

export default Pair;
