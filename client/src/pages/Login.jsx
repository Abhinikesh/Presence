import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Log in user locally in context
        login(data.token, data.user);

        // Fetch pairing status to determine redirect
        const statusResponse = await fetch('http://localhost:5000/api/pair/status', {
          headers: {
            'Authorization': `Bearer ${data.token}`
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.paired) {
            navigate('/home');
          } else {
            navigate('/pair');
          }
        } else {
          // Fallback to /pair if pairing status check fails
          navigate('/pair');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error, please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '40px auto' }}>
      <h2>Login</h2>
      {error && <p style={{ color: 'black', fontWeight: 'bold' }}>Error: {error}</p>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid black', boxSizing: 'border-box' }}
            required
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid black', boxSizing: 'border-box' }}
            required
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', background: 'white', border: '1px solid black', cursor: 'pointer' }}>
          Log In
        </button>
      </form>
      <p style={{ marginTop: '15px' }}>
        Don't have an account? <Link to="/signup" style={{ color: 'black' }}>Signup</Link>
      </p>
    </div>
  );
}

export default Login;
