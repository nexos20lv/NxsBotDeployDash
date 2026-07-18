import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Server, Activity, Terminal, Download } from 'lucide-react';

export default function Dashboard({ token, user }) {
  const [bots, setBots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', type: 'nodejs', main_file: 'index.js', start_command: 'node index.js' });

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleCreateBot = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBot)
      });
      if (res.ok) {
        setShowModal(false);
        fetchBots();
        setNewBot({ name: '', type: 'nodejs', main_file: 'index.js', start_command: 'node index.js' });
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    if(!confirm("Are you sure you want to update the panel? It will pull from GitHub and restart the server.")) return;
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.message);
    } catch(e) {
      console.error(e);
      alert("Failed to trigger update.");
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2>Your Bots</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage your hosted Discord applications</p>
        </div>
        <div className="flex gap-4">
          {user && user.role === 'admin' && (
            <button className="clay-btn btn-danger" onClick={handleUpdate}>
              <Download size={20} /> Update Panel
            </button>
          )}
          <button className="clay-btn" onClick={() => setShowModal(true)}>
            <Plus size={20} /> Create Bot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {bots.map(bot => (
          <div key={bot.id} className="clay-card flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Server size={24} color="var(--accent)" />
                <h3 style={{ margin: 0 }}>{bot.name}</h3>
              </div>
              <span className={`badge ${bot.status === 'online' ? 'badge-online' : 'badge-offline'}`}>
                {bot.status.toUpperCase()}
              </span>
            </div>
            
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <p><strong>Type:</strong> {bot.type}</p>
              <p><strong>Main File:</strong> {bot.main_file}</p>
            </div>

            <Link to={`/bot/${bot.id}`} style={{ textDecoration: 'none' }}>
              <button className="clay-btn w-full mt-2">
                <Terminal size={18} /> Manage
              </button>
            </Link>
          </div>
        ))}
        {bots.length === 0 && (
          <div className="clay-card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No bots found. Create one to get started.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="clay-card" style={{ width: '400px' }}>
            <h3 className="mb-4">Create New Bot</h3>
            <form onSubmit={handleCreateBot} className="flex-col gap-4">
              <input 
                className="clay-input" 
                placeholder="Bot Name" 
                value={newBot.name}
                onChange={e => setNewBot({...newBot, name: e.target.value})}
                required
              />
              <select 
                className="clay-input"
                value={newBot.type}
                onChange={e => setNewBot({...newBot, type: e.target.value})}
              >
                <option value="nodejs">Node.js</option>
                <option value="python">Python</option>
              </select>
              <input 
                className="clay-input" 
                placeholder="Main File (e.g., index.js)" 
                value={newBot.main_file}
                onChange={e => setNewBot({...newBot, main_file: e.target.value})}
                required
              />
              <div className="flex gap-4 mt-4">
                <button type="button" className="clay-btn btn-danger w-full" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="clay-btn btn-success w-full">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
