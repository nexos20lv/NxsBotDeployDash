import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="clay-card" style={{ width: '400px' }}>
        <div className="flex-col items-center mb-8">
          <div className="clay-card mb-4 flex justify-center items-center" style={{ width: '80px', height: '80px', borderRadius: '50%' }}>
            <LogIn size={32} color="var(--accent)" />
          </div>
          <h2 className="text-center">Welcome Back</h2>
          <p className="text-center" style={{ color: 'var(--text-muted)' }}>Login to deploy your bots</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          {error && <div style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</div>}
          <input 
            type="text" 
            className="clay-input" 
            placeholder="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input 
            type="password" 
            className="clay-input" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="clay-btn mt-4 w-full">Login</button>
        </form>
      </div>
    </div>
  );
}
