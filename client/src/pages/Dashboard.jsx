import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Server, Terminal } from 'lucide-react';
import Layout from '../components/Layout';

export default function Dashboard({ token, user }) {
  const [bots, setBots] = useState([]);

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


  return (
    <Layout user={user} topbarContent={{ left: <h2 style={{margin:0}}>Your Bots</h2> }}>
      <div className="mt-4">

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
    </Layout>
  );
}
