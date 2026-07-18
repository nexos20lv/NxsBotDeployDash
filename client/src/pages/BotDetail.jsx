import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Square, RefreshCw, ArrowLeft, Upload } from 'lucide-react';

export default function BotDetail({ token }) {
  const { id } = useParams();
  const [bot, setBot] = useState(null);
  const [logs, setLogs] = useState({ out: '', err: '' });
  const [ws, setWs] = useState(null);
  const terminalRef = useRef(null);

  const fetchBot = async () => {
    try {
      const res = await fetch(`/api/bots`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const currentBot = data.find(b => b.id === parseInt(id));
        setBot(currentBot);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBot();
    // Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ action: 'subscribe_logs', botId: id }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'logs') {
        setLogs(message.data);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }
    };

    setWs(socket);

    return () => {
      if (socket) socket.close();
    };
  }, [id]);

  const handleAction = async (action) => {
    try {
      const res = await fetch(`/api/bots/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchBot(); // Refresh status
      }
    } catch(e) {
      console.error(e);
    }
  };

  if (!bot) return <div className="p-8">Loading...</div>;

  return (
    <div className="mt-8">
      <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2>{bot.name} <span className={`badge ${bot.status === 'online' ? 'badge-online' : 'badge-offline'}`} style={{ fontSize: '0.6em', verticalAlign: 'middle' }}>{bot.status.toUpperCase()}</span></h2>
          <p style={{ color: 'var(--text-muted)' }}>{bot.directory}</p>
        </div>
        
        <div className="flex gap-4">
          {bot.status === 'offline' ? (
            <button className="clay-btn btn-success" onClick={() => handleAction('start')}>
              <Play size={18} /> Start
            </button>
          ) : (
            <button className="clay-btn btn-danger" onClick={() => handleAction('stop')}>
              <Square size={18} /> Stop
            </button>
          )}
          <button className="clay-btn" onClick={() => handleAction('restart')} disabled={bot.status === 'offline'}>
            <RefreshCw size={18} /> Restart
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="clay-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="mb-4">Terminal Console</h3>
          <div className="terminal-box" ref={terminalRef}>
            {logs.out && <div style={{ whiteSpace: 'pre-wrap' }}>{logs.out}</div>}
            {logs.err && <div style={{ color: '#ff5555', whiteSpace: 'pre-wrap' }}>{logs.err}</div>}
            {!logs.out && !logs.err && <div style={{ color: '#888' }}>Waiting for logs...</div>}
          </div>
        </div>

        <div className="clay-card flex-col gap-4">
          <h3>File Manager</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload your bot files here. Make sure your main file is named <strong>{bot.main_file}</strong>.</p>
          
          {/* Simple dummy upload button for UI representation */}
          <button className="clay-btn w-full mt-4" onClick={() => alert("File upload functionality to be implemented fully. You can manually copy files to " + bot.directory)}>
            <Upload size={18} /> Upload Files
          </button>
          
          <div className="mt-8">
            <h4>Settings</h4>
            <div className="mt-2" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <p>Type: {bot.type}</p>
              <p>Start Cmd: {bot.start_command}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
