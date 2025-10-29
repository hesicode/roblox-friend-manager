import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authAPI } from './utils/api';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Swipe from './pages/Swipe';
import Review from './pages/Review';
import Locked from './pages/Locked';

import './styles/App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const data = await authAPI.checkStatus();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Navbar user={user} onLogout={handleLogout} />

        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              user ? <Dashboard /> : <Navigate to="/" />
            }
          />

          <Route
            path="/swipe"
            element={
              user ? <Swipe /> : <Navigate to="/" />
            }
          />

          <Route
            path="/review"
            element={
              user ? <Review /> : <Navigate to="/" />
            }
          />

          <Route
            path="/locked"
            element={
              user ? <Locked /> : <Navigate to="/" />
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
