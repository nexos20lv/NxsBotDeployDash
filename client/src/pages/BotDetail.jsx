import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Square, RefreshCw, ArrowLeft, Terminal as TermIcon, Folder, Key, Settings, Save, FileText, Trash2, Upload, Server, Network } from 'lucide-react';
import Editor from '@monaco-editor/react';
import Layout from '../components/Layout';

export default function BotDetail({ token, user }) {
  const { id } = useParams();
  const [bot, setBot] = useState(null);
  const [logs, setLogs] = useState({ out: '', err: '' });
  const [metrics, setMetrics] = useState({ cpu: 0, memory: 0 });
  const [activeTab, setActiveTab] = useState('console');
  const terminalRef = useRef(null);

  // File Manager State
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  
  // Env State
  const [envContent, setEnvContent] = useState('');

  const fetchBot = async () => {
    try {
      const res = await fetch(`/api/bots`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setBot(data.find(b => b.id === parseInt(id)));
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    fetchBot();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onopen = () => socket.send(JSON.stringify({ action: 'subscribe_logs', botId: id }));
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'logs') {
        setLogs(message.data);
        if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      } else if (message.type === 'metrics') {
        setMetrics(message.data);
      }
    };
    return () => socket.close();
  }, [id]);

  const handleAction = async (action) => {
    try {
      const res = await fetch(`/api/bots/${id}/${action}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) fetchBot();
    } catch(e) { console.error(e); }
  };

  // --- FILE MANAGER ---
  const fetchFiles = async (dir = '') => {
    try {
      const res = await fetch(`/api/bots/${id}/fs/list?path=${dir}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setFiles(await res.json());
        setCurrentPath(dir);
      }
    } catch(e) { console.error(e); }
  };

  const loadFile = async (filename) => {
    try {
      const targetPath = currentPath ? `${currentPath}/${filename}` : filename;
      const res = await fetch(`/api/bots/${id}/fs/read?path=${targetPath}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSelectedFile(targetPath);
        setFileContent(data.content);
      }
    } catch(e) { console.error(e); }
  };

  const saveFile = async () => {
    try {
      const res = await fetch(`/api/bots/${id}/fs/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ path: selectedFile, content: fileContent })
      });
      if (res.ok) alert('File saved!');
    } catch(e) { console.error(e); }
  };

  const deleteFile = async (filename) => {
    if(!confirm(`Delete ${filename}?`)) return;
    try {
      const targetPath = currentPath ? `${currentPath}/${filename}` : filename;
      const res = await fetch(`/api/bots/${id}/fs/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ path: targetPath })
      });
      if (res.ok) {
        if(selectedFile === targetPath) setSelectedFile(null);
        fetchFiles(currentPath);
      }
    } catch(e) { console.error(e); }
  };

  // --- ENV MANAGER ---
  const loadEnv = async () => {
    try {
      const res = await fetch(`/api/bots/${id}/env`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEnvContent(data.content);
      }
    } catch(e) { console.error(e); }
  };

  const saveEnv = async () => {
    try {
      const res = await fetch(`/api/bots/${id}/env`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: envContent })
      });
      if (res.ok) alert('.env saved!');
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (activeTab === 'files') fetchFiles();
    if (activeTab === 'env') loadEnv();
  }, [activeTab]);


  if (!bot) return <div className="p-8">Loading...</div>;

  return (
    <Layout 
      user={user}
      sidebarType="bot"
      botId={bot.id}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      topbarContent={{
        left: (
          <h2 className="flex items-center gap-4" style={{margin:0}}>
            {bot.name} 
            <span className={`badge ${bot.status === 'online' ? 'badge-online' : 'badge-offline'}`} style={{ fontSize: '0.6em' }}>
              {bot.status.toUpperCase()}
            </span>
          </h2>
        ),
        right: (
          <div className="flex items-center gap-4">
            {bot.status === 'online' && (
              <div className="flex gap-4 mr-4" style={{ fontSize: '0.85rem' }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>RAM:</span>
                  <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((metrics.memory / 1024) * 100, 100)}%`, height: '100%', background: 'var(--accent)' }}></div>
                  </div>
                  <span>{metrics.memory} MB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--text-muted)' }}>CPU:</span>
                  <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${metrics.cpu}%`, height: '100%', background: '#3498db' }}></div>
                  </div>
                  <span>{metrics.cpu}%</span>
                </div>
              </div>
            )}
            {bot.status === 'offline' ? (
              <button className="clay-btn btn-success" style={{padding: '8px 16px', fontSize: '0.9rem'}} onClick={() => handleAction('start')}><Play size={16} /> Start</button>
            ) : (
              <button className="clay-btn btn-danger" style={{padding: '8px 16px', fontSize: '0.9rem'}} onClick={() => handleAction('stop')}><Square size={16} /> Stop</button>
            )}
            <button className="clay-btn" style={{padding: '8px 16px', fontSize: '0.9rem'}} onClick={() => handleAction('restart')} disabled={bot.status === 'offline'}><RefreshCw size={16} /> Restart</button>
          </div>
        )
      }}
    >
      {/* TAB CONTENT */}
      {activeTab === 'console' && (
        <div className="clay-card">
          <div className="terminal-box" ref={terminalRef} style={{ height: '600px' }}>
            {logs.out && <div style={{ whiteSpace: 'pre-wrap' }}>{logs.out}</div>}
            {logs.err && <div style={{ color: '#ff5555', whiteSpace: 'pre-wrap' }}>{logs.err}</div>}
            {!logs.out && !logs.err && <div style={{ color: '#888' }}>Waiting for logs...</div>}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="clay-card" style={{ height: '600px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>File Explorer</h3>
              <label className="clay-btn btn-success" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={14} /> Upload File
                <input 
                  type="file" 
                  style={{ display: 'none' }} 
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('path', currentPath);
                    try {
                      const res = await fetch(`/api/bots/${bot.id}/fs/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                      });
                      if (res.ok) {
                        fetchFiles(currentPath);
                      } else {
                        const data = await res.json();
                        alert("Upload failed: " + data.error);
                      }
                    } catch(err) {
                      alert("Upload failed");
                    }
                    e.target.value = null;
                  }} 
                />
              </label>
            </div>
            {currentPath !== '' && (
              <div 
                className="flex items-center gap-2 mb-2" 
                style={{ cursor: 'pointer', color: 'var(--accent)' }}
                onClick={() => fetchFiles(currentPath.split('/').slice(0, -1).join('/'))}
              >
                <Folder size={18} /> .. (Go back)
              </div>
            )}
            {files.map(f => (
              <div key={f.name} className="flex justify-between items-center mb-2 p-2" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div 
                  className="flex items-center gap-2 flex-1" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => f.isDirectory ? fetchFiles(currentPath ? `${currentPath}/${f.name}` : f.name) : loadFile(f.name)}
                >
                  {f.isDirectory ? <Folder size={18} color="#f1c40f" /> : <FileText size={18} color="#3498db" />}
                  <span>{f.name}</span>
                </div>
                {!f.isDirectory && (
                  <button onClick={() => deleteFile(f.name)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {files.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Empty directory.</p>}
          </div>
          <div className="clay-card" style={{ gridColumn: 'span 2', height: '600px', display: 'flex', flexDirection: 'column' }}>
            {selectedFile ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3>Editing: {selectedFile}</h3>
                  <button className="clay-btn btn-success" onClick={saveFile}><Save size={16} /> Save File</button>
                </div>
                <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden' }}>
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    path={selectedFile}
                    value={fileContent}
                    onChange={(val) => setFileContent(val)}
                  />
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-full" style={{ color: 'var(--text-muted)' }}>
                Select a file to edit
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'env' && (
        <div className="clay-card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3>Environment Variables (.env)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Store your Discord token and API keys here.</p>
            </div>
            <button className="clay-btn btn-success" onClick={saveEnv}><Save size={16} /> Save .env</button>
          </div>
          <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language="ini"
              value={envContent}
              onChange={(val) => setEnvContent(val)}
            />
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="clay-card p-8">
          <h3 className="mb-6 text-xl">Settings</h3>
          
          <div className="flex-col gap-6 flex">
            {/* FTP Connection Details */}
            <div className="p-6" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '10px', borderRadius: '10px' }}>
                  <Network size={24} color="#3498db" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>FTP Connection Details</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Connect via FileZilla or WinSCP to manage your bot's files.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4" style={{ fontSize: '0.9rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Host</p>
                  <code style={{ fontSize: '1rem', color: 'var(--accent)' }}>{window.location.hostname}</code>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Port</p>
                  <code style={{ fontSize: '1rem', color: 'var(--accent)' }}>2121</code>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Username</p>
                  <code style={{ fontSize: '1rem', color: 'var(--accent)' }}>bot_{bot.id}</code>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>Password</p>
                  <code 
                    style={{ fontSize: '1rem', color: 'var(--accent)', cursor: 'pointer' }}
                    onClick={(e) => {
                      if (e.target.innerText === '••••••••••') {
                        e.target.innerText = bot.ftp_password || 'Not generated yet (Restart panel)';
                      } else {
                        e.target.innerText = '••••••••••';
                      }
                    }}
                  >
                    ••••••••••
                  </code>
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Click to reveal)</span>
                </div>
              </div>
            </div>

            {/* GitHub Auto-Deploy */}
            <div className="p-6" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 className="flex items-center gap-2 mb-2" style={{ fontSize: '1.1rem' }}><RefreshCw size={20} color="var(--accent)" /> GitHub Auto-Deploy Webhook</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Paste this URL into your GitHub repository settings (Settings {'>'} Webhooks {'>'} Add webhook) to automatically deploy code when you push.
              </p>
              <div className="mt-4 flex gap-2">
                <input 
                  className="clay-input flex-1" 
                  readOnly 
                  value={`${window.location.protocol}//${window.location.host}/api/webhooks/github/${bot.id}`} 
                />
                <button className="clay-btn" onClick={() => navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/webhooks/github/${bot.id}`)}>
                  Copy
                </button>
              </div>
            </div>

            {/* Dependencies & Backups */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 className="mb-2" style={{ fontSize: '1.1rem' }}>📦 Dependency Installer</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Automatically run <code>npm install</code> or <code>pip install -r requirements.txt</code> in your bot's folder.
                </p>
                <button 
                  className="clay-btn btn-success w-full" 
                  onClick={async (e) => {
                    e.target.disabled = true;
                    e.target.innerText = 'Installing...';
                    try {
                      const res = await fetch(`/api/bots/${bot.id}/install`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                      const data = await res.json();
                      alert(data.message || data.error);
                    } finally {
                      e.target.disabled = false;
                      e.target.innerText = 'Install Dependencies';
                    }
                  }}
                >
                  Install Dependencies
                </button>
              </div>

              <div className="p-6" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 className="mb-2" style={{ fontSize: '1.1rem' }}>🗄️ Create Backup</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Download a complete ZIP archive of your bot's directory including all code and assets.
                </p>
                <button 
                  className="clay-btn w-full" 
                  onClick={() => {
                    const url = `/api/bots/${bot.id}/backups/download`;
                    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                      .then(res => res.blob())
                      .then(blob => {
                        const a = document.createElement('a');
                        a.href = window.URL.createObjectURL(blob);
                        a.download = `backup_${bot.name}.zip`;
                        a.click();
                      });
                  }}
                >
                  Download ZIP
                </button>
              </div>
            </div>

            {/* Bot Info */}
            <div className="p-6 mt-4" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>Bot Information</h4>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <p>Type: <span style={{ color: 'var(--accent)' }}>{bot.type.toUpperCase()}</span></p>
                <p>Start Cmd: <code>{bot.start_command}</code></p>
                <p>Main File: <code>{bot.main_file}</code></p>
                <p>Directory: <code>{bot.directory}</code></p>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </Layout>
  );
}
