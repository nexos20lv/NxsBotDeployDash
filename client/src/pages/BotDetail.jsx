import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Square, RefreshCw, ArrowLeft, Terminal as TermIcon, Folder, Key, Settings, Save, FileText, Trash2, Upload, Server, Network, FolderPlus, FilePlus, Archive, Plus } from 'lucide-react';
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
  
  const [envContent, setEnvContent] = useState('');
  const [settingsTab, setSettingsTab] = useState('ftp');
  const [modalConfig, setModalConfig] = useState(null); // { title, type: 'prompt'|'alert', message, onConfirm }

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

  const clearLogs = async () => {
    try {
      const res = await fetch(`/api/bots/${id}/logs/clear`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        setLogs({ out: '', err: '' });
      }
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
      if (res.ok) {
        setModalConfig({ title: 'Success', type: 'alert', message: 'File saved successfully!' });
      }
    } catch(e) { console.error(e); }
  };

  const deleteFile = async (filename) => {
    setModalConfig({
      title: "Confirm Deletion",
      type: "prompt",
      message: `Type 'yes' to permanently delete ${filename}:`,
      onConfirm: async (val) => {
        if (val.toLowerCase() !== 'yes') return;
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
      }
    });
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
      if (res.ok) {
        setModalConfig({ title: 'Success', type: 'alert', message: '.env saved successfully!' });
      }
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
        <div className="clay-card" style={{ display: 'flex', flexDirection: 'column', height: '650px' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TermIcon size={20} /> Live Console
            </h3>
            <button className="clay-btn" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={clearLogs}>
              <Trash2 size={14} /> Clear Logs
            </button>
          </div>
          <div className="terminal-box" ref={terminalRef} style={{ flex: 1, padding: '20px', fontSize: '0.95rem', lineHeight: '1.4' }}>
            {logs.out && <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{logs.out}</div>}
            {logs.err && <div style={{ color: '#ff5555', whiteSpace: 'pre-wrap', fontFamily: 'monospace', marginTop: '10px' }}>{logs.err}</div>}
            {!logs.out && !logs.err && <div style={{ color: '#888', fontStyle: 'italic' }}>Waiting for logs...</div>}
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="clay-card" style={{ height: '600px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>File Explorer</h3>
              <div className="flex gap-2">
                <button className="clay-btn" style={{ padding: '6px 8px' }} title="New File" onClick={() => {
                  setModalConfig({
                    title: "New File",
                    type: "prompt",
                    message: "Enter file name:",
                    onConfirm: async (name) => {
                      if (name) {
                        await fetch(`/api/bots/${bot.id}/fs/create-file`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: currentPath, name }) });
                        fetchFiles(currentPath);
                      }
                    }
                  });
                }}><FilePlus size={16} /></button>
                <button className="clay-btn" style={{ padding: '6px 8px' }} title="New Folder" onClick={() => {
                  setModalConfig({
                    title: "New Folder",
                    type: "prompt",
                    message: "Enter folder name:",
                    onConfirm: async (name) => {
                      if (name) {
                        await fetch(`/api/bots/${bot.id}/fs/create-folder`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: currentPath, name }) });
                        fetchFiles(currentPath);
                      }
                    }
                  });
                }}><FolderPlus size={16} /></button>
                
                <div className="dropdown" style={{ position: 'relative', display: 'inline-block' }}>
                  <button className="clay-btn btn-success flex items-center gap-2" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={(e) => {
                    const menu = e.currentTarget.nextElementSibling;
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                  }}>
                    <Plus size={14} /> Upload
                  </button>
                  <div style={{ display: 'none', position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', zIndex: 100, minWidth: '150px', overflow: 'hidden' }}>
                    <label className="flex items-center gap-2 p-3 hover:bg-white/5 cursor-pointer text-sm" style={{ transition: '0.2s' }}>
                      <Upload size={14} /> Upload File
                      <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('path', currentPath);
                        await fetch(`/api/bots/${bot.id}/fs/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
                        fetchFiles(currentPath);
                        e.target.parentNode.parentNode.style.display = 'none';
                        e.target.value = null;
                      }} />
                    </label>
                    <label className="flex items-center gap-2 p-3 hover:bg-white/5 cursor-pointer text-sm" style={{ transition: '0.2s', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <Folder size={14} /> Upload Folder
                      <input type="file" webkitdirectory="" directory="" style={{ display: 'none' }} onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;
                        const formData = new FormData();
                        const paths = [];
                        files.forEach(f => {
                          formData.append('files', f);
                          paths.push(f.webkitRelativePath);
                        });
                        formData.append('path', currentPath);
                        formData.append('paths', JSON.stringify(paths));
                        await fetch(`/api/bots/${bot.id}/fs/upload-folder`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
                        fetchFiles(currentPath);
                        e.target.parentNode.parentNode.style.display = 'none';
                        e.target.value = null;
                      }} />
                    </label>
                    <label className="flex items-center gap-2 p-3 hover:bg-white/5 cursor-pointer text-sm" style={{ transition: '0.2s', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <Archive size={14} /> Upload & Unzip
                      <input type="file" accept=".zip" style={{ display: 'none' }} onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('path', currentPath);
                        try {
                          const res = await fetch(`/api/bots/${bot.id}/fs/unzip`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
                          const data = await res.json();
                          if (res.ok) {
                            setModalConfig({ title: "Success", type: "alert", message: "ZIP Extracted successfully!" });
                          } else {
                            setModalConfig({ title: "Error", type: "alert", message: "Error: " + data.error });
                          }
                        } catch(err) {
                          setModalConfig({ title: "Error", type: "alert", message: "Upload failed" });
                        }
                        fetchFiles(currentPath);
                        e.target.parentNode.parentNode.style.display = 'none';
                        e.target.value = null;
                      }} />
                    </label>
                  </div>
                </div>
              </div>
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
                <button onClick={() => deleteFile(f.name)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
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
        <div className="clay-card flex p-0 overflow-hidden" style={{ height: '600px' }}>
          {/* Settings Sidebar */}
          <div className="settings-sidebar">
            <h3 className="mb-4 mt-2 px-2" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Settings</h3>
            <button 
              className={`settings-tab-btn ${settingsTab === 'ftp' ? 'active' : ''}`}
              onClick={() => setSettingsTab('ftp')}
            ><Network size={18} /> FTP Credentials</button>
            <button 
              className={`settings-tab-btn ${settingsTab === 'github' ? 'active' : ''}`}
              onClick={() => setSettingsTab('github')}
            ><RefreshCw size={18} /> GitHub Deploy</button>
            <button 
              className={`settings-tab-btn ${settingsTab === 'dependencies' ? 'active' : ''}`}
              onClick={() => setSettingsTab('dependencies')}
            ><Server size={18} /> Dependencies</button>
            <button 
              className={`settings-tab-btn ${settingsTab === 'backups' ? 'active' : ''}`}
              onClick={() => setSettingsTab('backups')}
            ><Archive size={18} /> Backups</button>
            <button 
              className={`settings-tab-btn ${settingsTab === 'info' ? 'active' : ''}`}
              onClick={() => setSettingsTab('info')}
            ><Settings size={18} /> Configuration</button>
          </div>

          {/* Settings Content */}
          <div className="settings-content">
            {settingsTab === 'ftp' && (
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-blue-500/20">
                    <Network size={32} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">FTP Details</h2>
                    <p className="text-gray-400 m-0 mt-1">Connect via FileZilla or WinSCP to manage files remotely.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Host IP</p>
                    <code style={{ fontSize: '1.25rem', color: '#3498db' }}>{window.location.hostname}</code>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Port</p>
                    <code style={{ fontSize: '1.25rem', color: '#3498db' }}>2121</code>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Username</p>
                    <code style={{ fontSize: '1.25rem', color: '#3498db' }}>bot_{bot.id}</code>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Password</p>
                    <code 
                      style={{ fontSize: '1.25rem', color: '#3498db', cursor: 'pointer' }}
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
                    <p className="text-xs text-gray-500 mt-2">(Click to reveal)</p>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'github' && (
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-purple-500/20">
                    <RefreshCw size={32} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">Auto-Deploy</h2>
                    <p className="text-gray-400 m-0 mt-1">Automatically pull code from GitHub when you push.</p>
                  </div>
                </div>
                
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '24px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>Webhook URL</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Paste this URL into your GitHub repository (Settings {'>'} Webhooks {'>'} Add webhook).</p>
                  <div className="flex gap-4">
                    <input 
                      className="clay-input flex-1" 
                      style={{ fontSize: '1.1rem', padding: '12px 16px' }}
                      readOnly 
                      value={`${window.location.protocol}//${window.location.host}/api/webhooks/github/${bot.id}`} 
                    />
                    <button className="clay-btn" style={{ padding: '0 32px' }} onClick={() => navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/webhooks/github/${bot.id}`)}>
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'dependencies' && (
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-green-500/20">
                    <Server size={32} className="text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">Dependencies</h2>
                    <p className="text-gray-400 m-0 mt-1">Manage project packages automatically.</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', marginTop: '24px' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Run Installer</h4>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                    This will run <code>npm install</code> or <code>pip install -r requirements.txt</code> depending on your bot type. This process might take a few minutes.
                  </p>
                  <button 
                    className="clay-btn btn-success" 
                    style={{ padding: '16px 32px', fontSize: '1.1rem', margin: '0 auto' }}
                    onClick={async (e) => {
                      e.target.disabled = true;
                      e.target.innerText = 'Installing...';
                      try {
                        const res = await fetch(`/api/bots/${bot.id}/install`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                        const data = await res.json();
                        setModalConfig({ title: "Installer", type: "alert", message: data.message || data.error });
                      } finally {
                        e.target.disabled = false;
                        e.target.innerText = 'Install Dependencies';
                      }
                    }}
                  >
                    Install Dependencies
                  </button>
                </div>
              </div>
            )}

            {settingsTab === 'backups' && (
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-orange-500/20">
                    <Archive size={32} className="text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">Backups</h2>
                    <p className="text-gray-400 m-0 mt-1">Download and secure your files.</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', marginTop: '24px' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Download ZIP Backup</h4>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                    Generate and download a complete ZIP archive of your bot's directory including all code and assets.
                  </p>
                  <button 
                    className="clay-btn" 
                    style={{ padding: '16px 32px', fontSize: '1.1rem', margin: '0 auto' }}
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
            )}

            {settingsTab === 'info' && (
              <div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-gray-500/20">
                    <Settings size={32} className="text-gray-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold m-0">Configuration</h2>
                    <p className="text-gray-400 m-0 mt-1">Technical details about this instance.</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', marginTop: '24px' }}>
                  <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '16px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>Bot ID</div>
                    <div style={{ padding: '16px', gridColumn: 'span 2', color: '#fff', fontFamily: 'monospace' }}>{bot.id}</div>
                  </div>
                  <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '16px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>Type</div>
                    <div style={{ padding: '16px', gridColumn: 'span 2', color: '#3498db', fontWeight: 'bold' }}>{bot.type.toUpperCase()}</div>
                  </div>
                  <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '16px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>Start Command</div>
                    <div style={{ padding: '16px', gridColumn: 'span 2', color: '#2ecc71', fontFamily: 'monospace' }}>{bot.start_command}</div>
                  </div>
                  <div className="grid grid-cols-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '16px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>Main File</div>
                    <div style={{ padding: '16px', gridColumn: 'span 2', color: '#f1c40f', fontFamily: 'monospace' }}>{bot.main_file}</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div style={{ padding: '16px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>Root Directory</div>
                    <div style={{ padding: '16px', gridColumn: 'span 2', color: '#ccc', fontFamily: 'monospace', fontSize: '0.85rem' }}>{bot.directory}</div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Custom Modal overlay */}
      {modalConfig && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">{modalConfig.title}</h3>
            {modalConfig.type === 'prompt' ? (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>{modalConfig.message}</p>
                <input 
                  type="text" 
                  className="clay-input" 
                  id="modal-prompt-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      modalConfig.onConfirm(e.target.value);
                      setModalConfig(null);
                    }
                  }}
                />
              </div>
            ) : (
              <p className="modal-body">{modalConfig.message}</p>
            )}
            <div className="modal-actions">
              <button className="clay-btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => setModalConfig(null)}>
                {modalConfig.type === 'prompt' ? 'Cancel' : 'Close'}
              </button>
              {modalConfig.type === 'prompt' && (
                <button className="clay-btn btn-success" onClick={() => {
                  const val = document.getElementById('modal-prompt-input').value;
                  modalConfig.onConfirm(val);
                  setModalConfig(null);
                }}>
                  Confirm
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
