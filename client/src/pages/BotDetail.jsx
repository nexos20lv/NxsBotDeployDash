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
  
  // Env State
  const [envContent, setEnvContent] = useState('');
  const [settingsTab, setSettingsTab] = useState('ftp');

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
              <div className="flex gap-2">
                <button className="clay-btn" style={{ padding: '6px 8px' }} title="New File" onClick={async () => {
                  const name = prompt("Enter file name:");
                  if (name) {
                    await fetch(`/api/bots/${bot.id}/fs/create-file`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: currentPath, name }) });
                    fetchFiles(currentPath);
                  }
                }}><FilePlus size={16} /></button>
                <button className="clay-btn" style={{ padding: '6px 8px' }} title="New Folder" onClick={async () => {
                  const name = prompt("Enter folder name:");
                  if (name) {
                    await fetch(`/api/bots/${bot.id}/fs/create-folder`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: currentPath, name }) });
                    fetchFiles(currentPath);
                  }
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
                          if (res.ok) alert("ZIP Extracted successfully!");
                          else alert("Error: " + data.error);
                        } catch(err) { alert("Upload failed"); }
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
        <div className="clay-card flex h-[600px] p-0 overflow-hidden">
          {/* Settings Sidebar */}
          <div className="w-64 border-r border-white/5 p-4 flex flex-col gap-2 bg-black/10">
            <h3 className="mb-4 mt-2 px-2 text-xl font-bold">Settings</h3>
            <button 
              className={`text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settingsTab === 'ftp' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              onClick={() => setSettingsTab('ftp')}
            ><Network size={18} /> FTP Credentials</button>
            <button 
              className={`text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settingsTab === 'github' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              onClick={() => setSettingsTab('github')}
            ><RefreshCw size={18} /> GitHub Deploy</button>
            <button 
              className={`text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settingsTab === 'dependencies' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              onClick={() => setSettingsTab('dependencies')}
            ><Server size={18} /> Dependencies</button>
            <button 
              className={`text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settingsTab === 'backups' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              onClick={() => setSettingsTab('backups')}
            ><Archive size={18} /> Backups</button>
            <button 
              className={`text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${settingsTab === 'info' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              onClick={() => setSettingsTab('info')}
            ><Settings size={18} /> Configuration</button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-8 overflow-y-auto">
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
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <p className="text-gray-400 mb-2">Host IP</p>
                    <code className="text-xl text-blue-400">{window.location.hostname}</code>
                  </div>
                  <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <p className="text-gray-400 mb-2">Port</p>
                    <code className="text-xl text-blue-400">2121</code>
                  </div>
                  <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <p className="text-gray-400 mb-2">Username</p>
                    <code className="text-xl text-blue-400">bot_{bot.id}</code>
                  </div>
                  <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                    <p className="text-gray-400 mb-2">Password</p>
                    <code 
                      className="text-xl text-blue-400 cursor-pointer select-all"
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
                
                <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                  <h4 className="mb-2 font-bold text-lg">Webhook URL</h4>
                  <p className="text-gray-400 text-sm mb-4">Paste this URL into your GitHub repository (Settings {'>'} Webhooks {'>'} Add webhook).</p>
                  <div className="flex gap-4">
                    <input 
                      className="clay-input flex-1 text-lg py-3" 
                      readOnly 
                      value={`${window.location.protocol}//${window.location.host}/api/webhooks/github/${bot.id}`} 
                    />
                    <button className="clay-btn px-8" onClick={() => navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/webhooks/github/${bot.id}`)}>
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

                <div className="bg-black/20 p-8 rounded-xl border border-white/5 text-center">
                  <h4 className="text-xl font-bold mb-4">Run Installer</h4>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    This will run <code>npm install</code> or <code>pip install -r requirements.txt</code> depending on your bot type. This process might take a few minutes.
                  </p>
                  <button 
                    className="clay-btn btn-success py-3 px-8 text-lg" 
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

                <div className="bg-black/20 p-8 rounded-xl border border-white/5 text-center">
                  <h4 className="text-xl font-bold mb-4">Download ZIP Backup</h4>
                  <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Generate and download a complete ZIP archive of your bot's directory including all code and assets.
                  </p>
                  <button 
                    className="clay-btn py-3 px-8 text-lg" 
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

                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                  <div className="grid grid-cols-3 border-b border-white/5">
                    <div className="p-4 text-gray-400 bg-white/5">Bot ID</div>
                    <div className="p-4 col-span-2 text-white font-mono">{bot.id}</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-white/5">
                    <div className="p-4 text-gray-400 bg-white/5">Type</div>
                    <div className="p-4 col-span-2 text-blue-400 font-bold">{bot.type.toUpperCase()}</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-white/5">
                    <div className="p-4 text-gray-400 bg-white/5">Start Command</div>
                    <div className="p-4 col-span-2 text-green-400 font-mono">{bot.start_command}</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-white/5">
                    <div className="p-4 text-gray-400 bg-white/5">Main File</div>
                    <div className="p-4 col-span-2 text-yellow-400 font-mono">{bot.main_file}</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="p-4 text-gray-400 bg-white/5">Root Directory</div>
                    <div className="p-4 col-span-2 text-gray-300 font-mono text-sm">{bot.directory}</div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </Layout>
  );
}
