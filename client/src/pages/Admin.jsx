import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Server, Plus, Trash2, Download, Terminal, Activity, Cpu } from 'lucide-react';
import Layout from '../components/Layout';

export default function Admin({ token, user }) {
  const [users, setUsers] = useState([]);
  const [bots, setBots] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [newBot, setNewBot] = useState({ name: '', type: 'nodejs', main_file: 'index.js', start_command: 'node index.js', assigned_owner_id: '' });
  
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateLogs, setUpdateLogs] = useState('');
  const updateTerminalRef = React.useRef(null);

  const fetchData = async () => {
    try {
      const [usersRes, botsRes] = await Promise.all([
        fetch('/api/auth/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/bots', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (botsRes.ok) setBots(await botsRes.json());
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdatePanel = () => {
    if(!confirm("Are you sure you want to update the panel? It will pull from GitHub and restart the server.")) return;
    
    setShowUpdateModal(true);
    setUpdateLogs("Starting update process...\nConnecting to server...\n");
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ action: 'update_panel', token }));
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'update_logs') {
        setUpdateLogs(prev => prev + message.data);
        if (updateTerminalRef.current) {
          updateTerminalRef.current.scrollTop = updateTerminalRef.current.scrollHeight;
        }
      }
    };
    
    socket.onerror = () => {
      setUpdateLogs(prev => prev + "\n[Error] Connection lost. The server might be restarting.");
    };
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowUserModal(false);
        setNewUser({ username: '', password: '', role: 'user' });
        fetchData();
      } else alert(await res.text());
    } catch(e) { console.error(e); }
  };

  const handleCreateBot = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newBot)
      });
      if (res.ok) {
        setShowBotModal(false);
        setNewBot({ name: '', type: 'nodejs', main_file: 'index.js', start_command: 'node index.js', assigned_owner_id: '' });
        fetchData();
      } else alert(await res.text());
    } catch(e) { console.error(e); }
  };

  const handleDeleteUser = async (id) => {
    if(!confirm('Delete this user?')) return;
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch(e) { console.error(e); }
  };

  return (
    <Layout 
      user={user} 
      topbarContent={{ 
        left: <h2 style={{margin:0}}>Admin Panel</h2>,
        right: (
          <button className="clay-btn btn-danger flex items-center gap-2" onClick={handleUpdatePanel}>
            <Download size={20} /> Update Panel
          </button>
        )
      }}
    >
      <div className="mt-4">

      <div className="flex-col gap-8 flex">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-6 mb-4">
          <div className="clay-card flex items-center gap-4 p-6">
            <div style={{ background: 'rgba(138, 43, 226, 0.2)', padding: '16px', borderRadius: '16px' }}>
              <Users size={32} color="var(--accent)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL CLIENTS</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{users.length}</h2>
            </div>
          </div>
          <div className="clay-card flex items-center gap-4 p-6">
            <div style={{ background: 'rgba(138, 43, 226, 0.2)', padding: '16px', borderRadius: '16px' }}>
              <Server size={32} color="var(--accent)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL HOSTINGS</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{bots.length}</h2>
            </div>
          </div>
          <div className="clay-card flex items-center gap-4 p-6">
            <div style={{ background: 'rgba(46, 204, 113, 0.2)', padding: '16px', borderRadius: '16px' }}>
              <Activity size={32} color="var(--success)" />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>ONLINE BOTS</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{bots.filter(b => b.status === 'online').length}</h2>
            </div>
          </div>
        </div>

        {/* Users Section */}
        <div className="clay-card p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="flex items-center gap-3" style={{ fontSize: '1.4rem' }}>
                <Users size={24} color="var(--accent)" /> Client Management
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Create and manage access for your users</p>
            </div>
            <button className="clay-btn" onClick={() => setShowUserModal(true)}><Plus size={18} /> New Client</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>ID</th>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>Username</th>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>Role</th>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ background: 'rgba(0,0,0,0.15)', transition: 'background 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}>
                    <td style={{ padding: '16px', borderRadius: '12px 0 0 12px' }}>#{u.id}</td>
                    <td style={{ padding: '16px', fontWeight: '500' }}>{u.username}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={u.role === 'admin' ? 'badge badge-online' : 'badge badge-offline'} style={{ padding: '6px 12px' }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'rgba(231, 76, 60, 0.1)', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(231, 76, 60, 0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(231, 76, 60, 0.1)'}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hostings Section */}
        <div className="clay-card p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="flex items-center gap-3" style={{ fontSize: '1.4rem' }}>
                <Server size={24} color="var(--accent)" /> Hosting Allocation
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Allocate bots and server instances to your clients</p>
            </div>
            <button className="clay-btn" onClick={() => setShowBotModal(true)}><Plus size={18} /> Create Hosting</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>Bot Name</th>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>Owner</th>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>Type</th>
                  <th style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bots.map(b => (
                  <tr key={b.id} style={{ background: 'rgba(0,0,0,0.15)', transition: 'background 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}>
                    <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: b.status === 'online' ? 'var(--success)' : 'var(--danger)', boxShadow: `0 0 10px ${b.status === 'online' ? 'var(--success)' : 'var(--danger)'}` }}></div>
                      {b.name}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{b.owner_name}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem' }}>
                        {b.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                      <span className={b.status === 'online' ? 'badge badge-online' : 'badge badge-offline'} style={{ padding: '6px 12px' }}>
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUserModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="clay-card" style={{ width: '400px' }}>
            <h3 className="mb-4">Create New Client</h3>
            <form onSubmit={handleCreateUser} className="flex-col gap-4">
              <input className="clay-input" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
              <input type="password" className="clay-input" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
              <select className="clay-input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="user">User (Client)</option>
                <option value="admin">Administrator</option>
              </select>
              <div className="flex gap-4 mt-4">
                <button type="button" className="clay-btn btn-danger w-full" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="clay-btn btn-success w-full">Create Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="clay-card" style={{ width: '400px' }}>
            <h3 className="mb-4">Allocate Bot Hosting</h3>
            <form onSubmit={handleCreateBot} className="flex-col gap-4">
              <select className="clay-input" value={newBot.assigned_owner_id} onChange={e => setNewBot({...newBot, assigned_owner_id: e.target.value})} required>
                <option value="" disabled>Select a Client...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <input className="clay-input" placeholder="Bot Name" value={newBot.name} onChange={e => setNewBot({...newBot, name: e.target.value})} required />
              <select className="clay-input" value={newBot.type} onChange={e => setNewBot({...newBot, type: e.target.value})}>
                <option value="nodejs">Node.js</option>
                <option value="python">Python</option>
              </select>
              <input className="clay-input" placeholder="Main File (e.g., index.js)" value={newBot.main_file} onChange={e => setNewBot({...newBot, main_file: e.target.value})} required />
              <input className="clay-input" placeholder="Start Cmd (e.g., node index.js)" value={newBot.start_command} onChange={e => setNewBot({...newBot, start_command: e.target.value})} required />
              <div className="flex gap-4 mt-4">
                <button type="button" className="clay-btn btn-danger w-full" onClick={() => setShowBotModal(false)}>Cancel</button>
                <button type="submit" className="clay-btn btn-success w-full">Create Hosting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="clay-card" style={{ width: '800px', maxWidth: '90vw' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="flex items-center gap-2"><Terminal size={20} /> Panel Update Log</h3>
              <button className="clay-btn btn-danger" onClick={() => setShowUpdateModal(false)}>Close</button>
            </div>
            <div className="terminal-box" ref={updateTerminalRef} style={{ height: '400px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {updateLogs}
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
}
