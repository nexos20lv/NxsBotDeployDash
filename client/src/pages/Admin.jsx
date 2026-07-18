import React, { useState, useEffect } from 'react';
import { Users, Server, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin({ token }) {
  const [users, setUsers] = useState([]);
  const [bots, setBots] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [newBot, setNewBot] = useState({ name: '', type: 'nodejs', main_file: 'index.js', start_command: 'node index.js', assigned_owner_id: '' });

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
    <div className="mt-8">
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <h2>Admin Panel</h2>
      <p style={{ color: 'var(--text-muted)' }} className="mb-8">Manage clients and allocate hostings.</p>

      <div className="grid grid-cols-2 gap-8">
        {/* Users Section */}
        <div className="clay-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="flex items-center gap-2"><Users size={20} color="var(--accent)" /> Clients</h3>
            <button className="clay-btn" onClick={() => setShowUserModal(true)}><Plus size={16} /> New Client</button>
          </div>
          
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th className="py-2">ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="py-2">{u.id}</td>
                  <td>{u.username}</td>
                  <td><span className={u.role === 'admin' ? 'badge badge-online' : 'badge badge-offline'}>{u.role}</span></td>
                  <td>
                    <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hostings Section */}
        <div className="clay-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="flex items-center gap-2"><Server size={20} color="var(--accent)" /> All Hostings</h3>
            <button className="clay-btn" onClick={() => setShowBotModal(true)}><Plus size={16} /> Create Hosting</button>
          </div>

          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th className="py-2">Bot Name</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bots.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="py-2">{b.name}</td>
                  <td>{b.owner_name}</td>
                  <td><span className={b.status === 'online' ? 'badge badge-online' : 'badge badge-offline'}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  );
}
