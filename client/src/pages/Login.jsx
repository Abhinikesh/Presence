import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const BACKEND_URL = 'http://localhost:5000';

function Login() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    const idToken = credentialResponse.credential;

    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  // TEMPORARY DEV LOGIN - REMOVE BEFORE PRODUCTION
  const handleDevLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/dev-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
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
        setError(data.error || 'Login failed on backend.');
      }
    } catch (err) {
      setError('Network error, please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-center">
      {/* Decorative blurred background blobs */}
      <div className="bg-blobs">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>

      {/* App logo and tagline */}
      <h1 style={{ position: 'relative', zIndex: 2 }}>Presence</h1>
      <p className="tagline" style={{ position: 'relative', zIndex: 2 }}>Stay connected, always</p>
 
      {/* Clean centered login card */}
      <div className="card" style={{ position: 'relative', zIndex: 2 }}>
        <h2>Welcome</h2>
        <p className="subtext">Sign in to continue</p>
 
        {error && (
          <div className="error-box">
            Error: {error}
          </div>
        )}

        {/* Center the google button and wrap in lift wrapper */}
        <div className="google-btn-wrapper" style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
          />
        </div>

        {/* Thin horizontal divider with "or" */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span style={{ padding: '0 12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        {/* TEMPORARY DEV LOGIN - REMOVE BEFORE PRODUCTION */}
        <form onSubmit={handleDevLogin}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Enter test name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-text"
              style={{ width: '100%', boxSizing: 'border-box' }}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn"
            style={{ 
              width: '100%', 
              border: '1px dashed var(--border-color)', 
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              padding: '10px 16px'
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Dev Bypass Sign-In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
