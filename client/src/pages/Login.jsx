import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { BACKEND_URL } from '../config';

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
      </div>
    </div>
  );
}

export default Login;
