import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { MusicProvider } from './features/music';
import Login from './pages/Login';
import Pair from './pages/Pair';
import Home from './pages/Home';
import { MusicPage } from './features/music';

// Persistent layout for authenticated routes to keep socket and audio engine mounted
function AuthenticatedLayout() {
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

  return (
    <SocketProvider>
      <MusicProvider>
        <Outlet />
      </MusicProvider>
    </SocketProvider>
  );
}

// logged-in users ko login page pe jaane se rokna
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
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<AuthenticatedLayout />}>
            <Route path="/pair" element={<Pair />} />
            <Route path="/home" element={<Home />} />
            <Route path="/music" element={<MusicPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
