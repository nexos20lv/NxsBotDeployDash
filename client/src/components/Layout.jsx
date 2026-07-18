import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shield, LogOut, Terminal, Folder, Key, Settings } from 'lucide-react';

export default function Layout({ user, children, sidebarType = 'global', botId = null, activeTab = '', setActiveTab = null, topbarContent = null }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '800' }}>NxsBotDeploy</h2>
        </div>

        {sidebarType === 'global' ? (
          <>
            <div className="sidebar-section-title">General</div>
            <Link to="/" className={`sidebar-item ${window.location.pathname === '/' ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            
            {user?.role === 'admin' && (
              <>
                <div className="sidebar-section-title">Administration</div>
                <Link to="/admin" className={`sidebar-item ${window.location.pathname === '/admin' ? 'active' : ''}`}>
                  <Shield size={18} /> Admin Panel
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            <Link to="/" className="sidebar-item" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>
              <LayoutDashboard size={18} /> Back to Dashboard
            </Link>
            
            <div className="sidebar-section-title">Management</div>
            <div 
              className={`sidebar-item ${activeTab === 'console' ? 'active' : ''}`}
              onClick={() => setActiveTab('console')}
            >
              <Terminal size={18} /> Console
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <Folder size={18} /> Files
            </div>
            
            <div className="sidebar-section-title">Configuration</div>
            <div 
              className={`sidebar-item ${activeTab === 'env' ? 'active' : ''}`}
              onClick={() => setActiveTab('env')}
            >
              <Key size={18} /> Environment
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} /> Settings & Backups
            </div>
          </>
        )}

        <div style={{ marginTop: 'auto' }}>
          <div className="sidebar-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
            <LogOut size={18} /> Logout
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            {topbarContent?.left}
          </div>
          <div className="topbar-right flex items-center gap-4">
            {topbarContent?.right}
            <div className="flex items-center gap-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user?.username}</span>
            </div>
          </div>
        </div>
        
        <div className="content-wrapper">
          <div className="container">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
