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
    // user already paired hai to direct home page pr bhejenge
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
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', backgroundColor: '#FAF9F7' }}>

      <div className="bg-blobs-premium">
        <div className="blob-purple" style={{ top: '-5%', right: '-5%', bottom: 'auto', left: 'auto' }} />
        <div className="blob-coral" style={{ bottom: '-10%', left: '5%', top: 'auto' }} />
        <div className="blob-yellow" style={{ top: '30%', left: '30%' }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        padding: '40px 24px'
      }}>

        <div style={{ width: '100%', maxWidth: '460px', marginBottom: '28px' }}>
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)',
            textDecoration: 'none'
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to start
          </a>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '36px', maxWidth: '460px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '22px' }}>
            <svg width="130" height="58" viewBox="0 0 130 58" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="29" r="20" fill="url(#pNodeL)" className="float-shape-1" />
              <circle cx="24" cy="29" r="12" fill="url(#pNodeInnerL)" />
              <circle cx="106" cy="29" r="20" fill="url(#pNodeR)" className="float-shape-2" />
              <circle cx="106" cy="29" r="12" fill="url(#pNodeInnerR)" />
              <line x1="44" y1="29" x2="86" y2="29"
                stroke="url(#pLinkGrad)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray="6 4" className="connecting-wave" />
              <circle cx="65" cy="29" r="5" fill="#EC4899" opacity="0.9" className="particle-1" />
              <circle cx="65" cy="29" r="10" fill="#EC4899" opacity="0.13" className="particle-1" />
              <defs>
                <linearGradient id="pNodeL" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFDDD5" /><stop offset="100%" stopColor="#E8623F" />
                </linearGradient>
                <radialGradient id="pNodeInnerL" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.9" /><stop offset="100%" stopColor="#E8623F" stopOpacity="0.25" />
                </radialGradient>
                <linearGradient id="pNodeR" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#DDD5FF" /><stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <radialGradient id="pNodeInnerR" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.9" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.25" />
                </radialGradient>
                <linearGradient id="pLinkGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E8623F" /><stop offset="50%" stopColor="#EC4899" /><stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '800',
            letterSpacing: '-0.025em', lineHeight: 1.1,
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-color) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            Connect with someone
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '400', lineHeight: 1.6 }}>
            Share your code, or enter theirs — one step to bring two people together.
          </p>
        </div>

        <div style={{
          width: '100%', maxWidth: '460px', marginBottom: '16px',
          background: '#FFFFFF', border: '1px solid var(--border-color)',
          borderRadius: '16px', boxShadow: '0 4px 24px rgba(26,26,26,0.06)',
          padding: '28px 28px 24px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #E8623F 0%, #EC4899 50%, #8B5CF6 100%)'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                Your Pair Code
              </p>
              <p style={{ fontSize: '0.8rem', color: '#B0AEA8' }}>Share this with your person</p>
            </div>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FDF1EE, #FDDDD5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="5" cy="4" r="2.5" stroke="#E8623F" strokeWidth="1.5"/>
                <circle cx="11" cy="4" r="2.5" stroke="#8B5CF6" strokeWidth="1.5"/>
                <path d="M1 13c0-2 1.8-3.5 4-3.5" stroke="#E8623F" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M15 13c0-2-1.8-3.5-4-3.5" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6 12.5Q8 11 10 12.5" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #FAF9F7 0%, #FDF1EE 100%)',
            border: '1.5px solid rgba(232,98,63,0.2)', borderRadius: '12px',
            padding: '20px 16px', marginBottom: '20px', gap: '4px', flexWrap: 'wrap'
          }}>
            {(user.pairCode || '------').split('').map((char, i) => (
              <span key={i} style={{
                fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: '800',
                fontFamily: "'DM Mono', 'Courier New', monospace",
                color: i < 3 ? 'var(--accent-color)' : '#8B5CF6',
                display: 'inline-block', width: '2.2ch', textAlign: 'center',
                letterSpacing: '0.02em'
              }}>{char}</span>
            ))}
          </div>

          <button onClick={handleCopy} style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
            border: copied ? '1.5px solid #2ECC71' : '1.5px solid rgba(232,98,63,0.25)',
            background: copied
              ? 'linear-gradient(135deg, #F0FFF4, #E6F9EE)'
              : 'linear-gradient(135deg, #FFFFFF, #FDF9F8)',
            color: copied ? '#137333' : 'var(--accent-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s ease'
          }}>
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 3.5" stroke="#137333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Copied to clipboard!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="4" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 4V2.5A1.5 1.5 0 0 1 6.5 1H11.5A1.5 1.5 0 0 1 13 2.5V8.5A1.5 1.5 0 0 1 11.5 10H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Copy Code
              </>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '460px', margin: '8px 0 16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#B0AEA8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or enter theirs</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <div style={{
          width: '100%', maxWidth: '460px',
          background: '#FFFFFF', border: '1px solid var(--border-color)',
          borderRadius: '16px', boxShadow: '0 4px 24px rgba(26,26,26,0.06)',
          padding: '28px 28px 24px', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 50%, #E8623F 100%)'
          }} />

          <div style={{ marginBottom: '18px' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Partner's Code
            </p>
            <p style={{ fontSize: '0.8rem', color: '#B0AEA8' }}>Paste the 6-character code they shared</p>
          </div>

          {error && (
            <div style={{
              marginBottom: '16px', padding: '10px 14px',
              background: '#FFF5F5', border: '1px solid #FCA5A5',
              borderRadius: '8px', fontSize: '0.8125rem', color: '#991B1B', fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleConnect}>
            <input
              type="text"
              placeholder="A3B9XZ"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              style={{
                width: '100%', padding: '14px 16px',
                fontSize: '1.4rem', fontWeight: '700', letterSpacing: '0.22em',
                textAlign: 'center', textTransform: 'uppercase',
                fontFamily: "'DM Mono', 'Courier New', monospace",
                border: '1.5px solid var(--border-color)', borderRadius: '10px',
                outline: 'none', background: '#FAFAFA', color: 'var(--text-primary)',
                marginBottom: '16px', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8B5CF6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.boxShadow = 'none';
              }}
            />

            <button type="submit" style={{
              width: '100%', padding: '14px',
              fontSize: '0.9375rem', fontWeight: '700',
              cursor: 'pointer', border: 'none', borderRadius: '10px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #E8623F 100%)',
              color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(139,92,246,0.28)',
              transition: 'all 0.2s ease'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,92,246,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(139,92,246,0.28)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M10 5L13 8L10 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Connect Now
            </button>
          </form>
        </div>

        <p style={{ fontSize: '0.73rem', color: '#B0AEA8', marginTop: '20px', textAlign: 'center' }}>
          Both of you only need to connect once — then you're paired forever.
        </p>
      </div>
    </div>
  );
}

export default Pair;
