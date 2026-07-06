import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const BACKEND_URL = 'http://localhost:5000';

function Login() {
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    const idToken = credentialResponse.credential;

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: idToken })
      });

      const data = await response.json();

      if (response.ok) {
        // Save JWT and user info in localStorage + context
        login(data.token, data.user);

        // Redirect: if user.pairId exists go to /home, otherwise go to /pair
        if (data.user.pairId) {
          navigate('/home');
        } else {
          navigate('/pair');
        }
      } else {
        setError(data.error || 'Google login failed on backend.');
      }
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      textAlign: 'center'
    }}>
      {/* App logo and tagline */}
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '-1px' }}>
        Presence
      </h1>
      <p style={{ fontSize: '1rem', color: '#666666', margin: '0 0 30px 0' }}>
        Stay connected, always
      </p>

      {/* Clean centered login card */}
      <div style={{
        width: '320px',
        padding: '30px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '0 0 10px 0' }}>
          Welcome
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#666666', margin: '0 0 24px 0' }}>
          Sign in to continue
        </p>

        {error && (
          <div style={{
            color: '#000000',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            padding: '10px',
            border: '1px solid #000000',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            Error: {error}
          </div>
        )}

        {/* Center the google button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
          />
        </div>
      </div>
    </div>
  );
}

export default Login;
