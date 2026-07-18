import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BotDetail from './pages/BotDetail';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  const handleLogin = (tokenData, userData) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        {token && (
          <nav className="p-8 flex justify-between items-center">
            <h2 style={{ color: 'var(--accent)' }}>NxsBotDeploy</h2>
            <div className="flex items-center gap-4">
              <span>{user?.username}</span>
              <button className="clay-btn btn-danger" onClick={handleLogout}>Logout</button>
            </div>
          </nav>
        )}
        <div className="container">
          <Routes>
            <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={token ? <Dashboard token={token} user={user} /> : <Navigate to="/login" />} />
            <Route path="/bot/:id" element={token ? <BotDetail token={token} /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
