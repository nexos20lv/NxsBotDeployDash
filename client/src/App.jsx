import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BotDetail from './pages/BotDetail';
import Admin from './pages/Admin';

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
              {user?.role === 'admin' && (
                <Link to="/admin" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '600' }}>Admin Panel</Link>
              )}
              <button className="clay-btn btn-danger" onClick={handleLogout}>Logout</button>
            </div>
          </nav>
        )}
        <div className="container">
          <Routes>
            <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={token ? <Dashboard token={token} user={user} /> : <Navigate to="/login" />} />
            <Route path="/bot/:id" element={token ? <BotDetail token={token} /> : <Navigate to="/login" />} />
            <Route path="/admin" element={token && user?.role === 'admin' ? <Admin token={token} /> : <Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
