import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Pair from './pages/Pair';
import Home from './pages/Home';

// Route wrapper to ensure user is authenticated
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <h1>Presence</h1>
        <p className="tagline">Loading...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Route wrapper to prevent logged-in users from accessing landing/login
function PublicRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-center">
        <h1>Presence</h1>
        <p className="tagline">Loading...</p>
      </div>
    );
  }

  if (token) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing & Login Route */}
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />

          {/* Protected Pairing & Dashboard Routes */}
          <Route path="/pair" element={<ProtectedRoute><Pair /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* Redirect all other routes to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
