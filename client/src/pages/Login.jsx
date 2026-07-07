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
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', backgroundColor: '#FAF9F7' }}>

      {/* === Layered background blobs === */}
      <div className="bg-blobs-premium">
        <div className="blob-coral" />
        <div className="blob-purple" />
        <div className="blob-yellow" />
      </div>

      {/* === Main Split Grid === */}
      <div className="login-split-container">

        {/* LEFT — Branding + Sign-In */}
        <div className="login-left-col">

          {/* Brand badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'rgba(232,98,63,0.08)', border: '1px solid rgba(232,98,63,0.18)',
            borderRadius: '100px', padding: '6px 14px', marginBottom: '28px'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent-color)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Always here with you
            </span>
          </div>

          {/* Main headline */}
          <h1 className="login-title">
            Your space<br />
            for <span style={{ WebkitTextFillColor: 'var(--accent-color)' }}>closeness</span>
          </h1>

          {/* Tagline */}
          <p className="login-tagline-lg">
            Presence brings two people together — share moods, music, moments and more, no matter where you are.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '36px' }}>
            {['Shared music', 'Live status', 'Watch together', 'Draw & play'].map(f => (
              <span key={f} style={{
                fontSize: '0.75rem', fontWeight: '600',
                padding: '5px 12px', borderRadius: '100px',
                backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}>{f}</span>
            ))}
          </div>

          {/* Sign-in block */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Sign in to get started — free, no account needed beyond Google.
            </p>

            {error && (
              <div className="error-box" style={{ marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <div className="google-btn-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
              />
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#B0AEA8', marginTop: '12px' }}>
            No subscription, no payments. Just connection.
          </p>
        </div>

        {/* RIGHT — SVG Illustration */}
        <div className="login-right-col">
          <svg viewBox="0 0 460 460" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', maxWidth: '420px', height: 'auto', overflow: 'visible' }}>

            {/* Large background circle (soft purple) */}
            <circle cx="230" cy="240" r="185" fill="url(#bgCircleGrad)" opacity="0.18" className="float-shape-2" />

            {/* Mid ring */}
            <circle cx="230" cy="240" r="145" stroke="rgba(139,92,246,0.12)" strokeWidth="1.5" fill="none" />

            {/* ==== LEFT PERSON ==== */}
            <g className="float-shape-1">
              {/* Head */}
              <circle cx="120" cy="162" r="30" fill="url(#personGradL)" />
              {/* Body */}
              <path d="M90 220 Q90 195 120 192 Q150 195 150 220 L158 310 Q158 325 120 325 Q82 325 82 310 Z"
                fill="url(#bodyGradL)" />
              {/* Arms reaching right */}
              <path d="M148 230 Q175 218 205 228" stroke="url(#armGradL)" strokeWidth="8" strokeLinecap="round" fill="none" />
            </g>

            {/* ==== CONNECTING WAVE LINE ==== */}
            <path d="M205 228 Q230 210 255 228"
              stroke="url(#waveGrad)" strokeWidth="3" strokeLinecap="round" fill="none"
              className="connecting-wave" />

            {/* Glow dot in the centre of the connection */}
            <circle cx="230" cy="219" r="7" fill="url(#glowDot)" opacity="0.9" className="particle-1" />
            <circle cx="230" cy="219" r="13" fill="url(#glowDot)" opacity="0.18" className="particle-1" />

            {/* ==== RIGHT PERSON ==== */}
            <g className="float-shape-2">
              {/* Head */}
              <circle cx="340" cy="162" r="30" fill="url(#personGradR)" />
              {/* Body */}
              <path d="M310 220 Q310 195 340 192 Q370 195 370 220 L378 310 Q378 325 340 325 Q302 325 302 310 Z"
                fill="url(#bodyGradR)" />
              {/* Arms reaching left */}
              <path d="M312 230 Q285 218 255 228" stroke="url(#armGradR)" strokeWidth="8" strokeLinecap="round" fill="none" />
            </g>

            {/* ==== Floating particles ==== */}
            <circle cx="100" cy="120" r="5" fill="rgba(232,98,63,0.5)" className="particle-1" />
            <circle cx="370" cy="100" r="4" fill="rgba(139,92,246,0.5)" className="particle-2" />
            <circle cx="80" cy="300" r="6" fill="rgba(241,196,15,0.45)" className="particle-3" />
            <circle cx="390" cy="320" r="5" fill="rgba(232,98,63,0.35)" className="particle-4" />

            {/* Small decorative cross / sparkle */}
            <g className="float-shape-1" style={{ transformOrigin: '155px 90px' }}>
              <line x1="155" y1="82" x2="155" y2="98" stroke="rgba(232,98,63,0.5)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="147" y1="90" x2="163" y2="90" stroke="rgba(232,98,63,0.5)" strokeWidth="2" strokeLinecap="round"/>
            </g>
            <g className="float-shape-2" style={{ transformOrigin: '315px 370px' }}>
              <line x1="315" y1="362" x2="315" y2="378" stroke="rgba(139,92,246,0.5)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="307" y1="370" x2="323" y2="370" stroke="rgba(139,92,246,0.5)" strokeWidth="2" strokeLinecap="round"/>
            </g>

            {/* Tiny dot ring decorations */}
            <circle cx="195" cy="355" r="3.5" fill="none" stroke="rgba(139,92,246,0.35)" strokeWidth="1.5" className="particle-3" />
            <circle cx="265" cy="355" r="3.5" fill="none" stroke="rgba(232,98,63,0.35)" strokeWidth="1.5" className="particle-4" />

            {/* ==== DEFS ==== */}
            <defs>
              <radialGradient id="bgCircleGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </radialGradient>

              <linearGradient id="personGradL" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFDDD5" />
                <stop offset="100%" stopColor="#E8623F" />
              </linearGradient>
              <linearGradient id="bodyGradL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8623F" />
                <stop offset="100%" stopColor="#C04A28" />
              </linearGradient>
              <linearGradient id="armGradL" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#E8623F" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>

              <linearGradient id="personGradR" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#DDD5FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="bodyGradR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6D28D9" />
              </linearGradient>
              <linearGradient id="armGradR" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#E8623F" />
              </linearGradient>

              <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#E8623F" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>

              <radialGradient id="glowDot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="40%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="rgba(236,72,153,0)" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default Login;

