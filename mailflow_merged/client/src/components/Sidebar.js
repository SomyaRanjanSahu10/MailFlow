import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import AccountSwitcher from './AccountSwitcher';
import api from '../utils/api';

const FOLDER_COLORS = ['#0078d4','#107c10','#d13438','#8764b8','#ca5010','#038387','#881798','#00b7c3'];

const NAV_ITEMS = [
  { id:'inbox',     label:'Inbox',     icon:'📥' },
  { id:'important', label:'Important', icon:'🔴' },
  { id:'sent',      label:'Sent',      icon:'📤' },
  { id:'drafts',    label:'Drafts',    icon:'📝' },
  { id:'scheduled', label:'Scheduled', icon:'🕐' },
  { id:'starred',   label:'Starred',   icon:'⭐' },
  { id:'archive',   label:'Archive',   icon:'📦' },
  { id:'calendar',  label:'Calendar',  icon:'📅' },
  { id:'trash',     label:'Trash',     icon:'🗑️' },   // Feature 1
];

export default function Sidebar({
  activeView, onNavigate, onCompose,
  unreadCount, draftCount, importantCount,
  folders, onFoldersChange,
}) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const { notifCount, clearNotifCount, notifications } = useSocket();
  const [showNotifs,     setShowNotifs]     = useState(false);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#0078d4');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError,    setFolderError]    = useState('');
  const [editingFolder,  setEditingFolder]  = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [showUserMenu,   setShowUserMenu]   = useState(false);

  // Folder handlers
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return setFolderError('Please enter a folder name.');
    setCreatingFolder(true); setFolderError('');
    try {
      await api.post('/folders', { name: newFolderName.trim(), color: newFolderColor });
      setNewFolderName(''); setNewFolderColor('#0078d4'); setShowNewFolder(false);
      onFoldersChange?.();
    } catch (err) { setFolderError(err.response?.data?.message || 'Failed to create folder.'); }
    finally { setCreatingFolder(false); }
  };

  const handleRenameFolder = async () => {
    if (!editingFolder.name.trim()) return;
    try {
      await api.put(`/folders/${editingFolder._id}`, { name: editingFolder.name, color: editingFolder.color });
      setEditingFolder(null); onFoldersChange?.();
    } catch (err) { alert(err.response?.data?.message || 'Failed to rename folder.'); }
  };

  const handleDeleteFolder = async folder => {
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;
    try {
      await api.delete(`/folders/${folder._id}`);
      if (activeView === `folder:${folder._id}`) onNavigate('inbox');
      onFoldersChange?.();
    } catch { alert('Failed to delete folder.'); }
  };

  const handleDragOver  = (e, fid) => { e.preventDefault(); setDragOverFolder(fid); };
  const handleDragLeave = ()        => setDragOverFolder(null);
  const handleDrop      = async (e, folder) => {
    e.preventDefault(); setDragOverFolder(null);
    const emailId = e.dataTransfer.getData('emailId');
    if (!emailId) return;
    try { await api.put(`/folders/${folder._id}/emails/${emailId}`); onFoldersChange?.('moved', emailId, folder); }
    catch { alert('Failed to move email.'); }
  };

  const notifColor = t => t==='mention'?'#8764b8':t==='important'?'#d13438':'#0078d4';

  const handleNavClick = (id) => {
    if (id === 'trash') { navigate('/trash'); return; }
    onNavigate(id);
  };

  return (
    <aside style={ST.sidebar}>
      {/* Header */}
      <div style={ST.header}>
        <div style={ST.logoRow}>
          <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.18)"/>
            <path d="M8 10h8v8H8zM20 10h8v8h-8zM8 22h8v8H8zM20 22h8v8h-8z" fill="white"/>
          </svg>
          <span style={ST.logoText}>MailFlow</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {/* Notification bell */}
          <div style={{ position:'relative' }}>
            <button style={ST.bellBtn} onClick={() => { setShowNotifs(s=>!s); if(!showNotifs) clearNotifCount(); }}>
              🔔{notifCount>0&&<span style={ST.bellBadge}>{notifCount>9?'9+':notifCount}</span>}
            </button>
            {showNotifs && (
              <div style={ST.notifPanel}>
                <div style={ST.notifHeader}>Notifications</div>
                {notifications.length===0
                  ? <div style={ST.notifEmpty}>No notifications</div>
                  : notifications.slice(0,10).map(n=>(
                      <div key={n.id} style={ST.notifItem}>
                        <div style={{ ...ST.notifDot, background:notifColor(n.type) }}/>
                        <div><div style={ST.notifMsg}>{n.message}</div>
                          <div style={ST.notifTime}>{new Date(n.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))
                }
              </div>
            )}
          </div>
          {/* Feature 5: Account switcher */}
          <AccountSwitcher/>
        </div>
      </div>

      {/* Compose */}
      <div style={ST.composeArea}>
        <button style={ST.composeBtn} onClick={onCompose}><span>✏️</span><span>New message</span></button>
      </div>

      {/* Navigation */}
      <nav style={ST.nav}>
        <span style={ST.navLabel}>MAILBOXES</span>
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => handleNavClick(item.id)}
            style={{ ...ST.navItem, ...(activeView===item.id ? ST.navItemActive : {}) }}>
            <span style={ST.navIcon}>{item.icon}</span>
            <span style={ST.navItemLabel}>{item.label}</span>
            {item.id==='inbox'     && unreadCount    > 0 && <span style={ST.badge}>{unreadCount}</span>}
            {item.id==='drafts'    && draftCount     > 0 && <span style={{...ST.badge, background:'rgba(255,185,0,0.3)'}}>{draftCount}</span>}
            {item.id==='important' && importantCount > 0 && <span style={{...ST.badge, background:'rgba(209,52,56,0.3)'}}>{importantCount}</span>}
          </button>
        ))}

        {/* Custom Folders */}
        <div style={ST.foldersHeader}>
          <span style={ST.navLabel}>MY FOLDERS</span>
          <button style={ST.newFolderBtn} onClick={() => { setShowNewFolder(s=>!s); setFolderError(''); }}>
            {showNewFolder ? '✕' : '＋'}
          </button>
        </div>

        {showNewFolder && (
          <div style={ST.newFolderForm}>
            <input type="text" value={newFolderName}
              onChange={e=>setNewFolderName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleCreateFolder()}
              placeholder="Folder name…" style={ST.newFolderInput} autoFocus/>
            <div style={ST.colorRow}>
              {FOLDER_COLORS.map(c=>(
                <button key={c} type="button" onClick={()=>setNewFolderColor(c)}
                  style={{...ST.colorDot, background:c, outline:newFolderColor===c?'2px solid white':'none'}}/>
              ))}
            </div>
            {folderError && <div style={ST.folderError}>{folderError}</div>}
            <button onClick={handleCreateFolder} disabled={creatingFolder} style={ST.createFolderBtn}>
              {creatingFolder?'Creating…':'Create Folder'}
            </button>
          </div>
        )}

        {(folders||[]).map(folder => (
          <div key={folder._id}>
            {editingFolder?._id===folder._id ? (
              <div style={ST.renamingRow}>
                <input value={editingFolder.name}
                  onChange={e=>setEditingFolder(ef=>({...ef,name:e.target.value}))}
                  onKeyDown={e=>{if(e.key==='Enter')handleRenameFolder();if(e.key==='Escape')setEditingFolder(null);}}
                  style={ST.renameInput} autoFocus/>
                <button onClick={handleRenameFolder} style={ST.renameOk}>✓</button>
                <button onClick={()=>setEditingFolder(null)} style={ST.renameCancel}>✕</button>
              </div>
            ) : (
              <div style={{
                  ...ST.folderItem,
                  ...(activeView===`folder:${folder._id}`?ST.folderItemActive:{}),
                  ...(dragOverFolder===folder._id?ST.folderItemDrag:{}),
                }}
                onClick={()=>onNavigate(`folder:${folder._id}`)}
                onDragOver={e=>handleDragOver(e,folder._id)}
                onDragLeave={handleDragLeave}
                onDrop={e=>handleDrop(e,folder)}>
                <span style={{...ST.folderDot,background:folder.color}}/>
                <span style={ST.folderName}>{folder.name}</span>
                <div style={ST.folderActions}>
                  <button style={ST.folderActionBtn} onClick={e=>{e.stopPropagation();setEditingFolder({...folder});}}>✏️</button>
                  <button style={ST.folderActionBtn} onClick={e=>{e.stopPropagation();handleDeleteFolder(folder);}}>🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {folders?.length===0 && !showNewFolder && (
          <div style={ST.noFolders}>No folders — click ＋ to create one</div>
        )}
      </nav>

      {/* Footer: User info + quick links + logout */}
      <div style={ST.footer}>
        {/* Avatar */}
        <div style={ST.footerAvatar}>
          {user?.avatar
            ? <img src={user.avatar} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/>
            : <span style={{ fontSize:'11px', fontWeight:'700', color:'white' }}>
                {user?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?'}
              </span>
          }
        </div>

        {/* Name + email */}
        <div style={ST.userInfo}>
          <div style={ST.userName}>{user?.name}</div>
          <div style={ST.userEmail}>{user?.email}</div>
        </div>

        {/* Icon buttons */}
        <div style={ST.footerIcons}>
          <button style={ST.footerIconBtn} onClick={()=>navigate('/profile')}   title="My Profile">👤</button>
          <button style={ST.footerIconBtn} onClick={()=>navigate('/signature')} title="Email Signature">✍️</button>
          {user?.role==='admin' && (
            <button style={ST.footerIconBtn} onClick={()=>navigate('/admin')} title="Admin Panel">⚙️</button>
          )}
          {/* LOGOUT BUTTON — clearly visible */}
          <button
            style={ST.logoutBtn}
            onClick={logout}
            title="Sign out"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}

const ST = {
  sidebar:     { width:'240px', flexShrink:0, background:'var(--ms-sidebar-bg)', display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' },
  header:      { padding:'12px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'6px' },
  logoRow:     { display:'flex', alignItems:'center', gap:'9px' },
  logoText:    { color:'white', fontSize:'16px', fontWeight:'700', letterSpacing:'-0.3px' },
  bellBtn:     { background:'transparent', border:'none', color:'rgba(255,255,255,0.7)', fontSize:'15px', cursor:'pointer', padding:'3px', borderRadius:'6px', position:'relative' },
  bellBadge:   { position:'absolute', top:'-4px', right:'-4px', background:'#d13438', color:'white', borderRadius:'8px', fontSize:'9px', fontWeight:'700', padding:'1px 4px', minWidth:'16px', textAlign:'center' },
  notifPanel:  { position:'absolute', top:'100%', right:0, width:'300px', background:'#2d2d3f', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.4)', zIndex:500, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' },
  notifHeader: { padding:'10px 14px', color:'rgba(255,255,255,0.9)', fontSize:'12px', fontWeight:'700', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.05)' },
  notifEmpty:  { padding:'16px 14px', color:'rgba(255,255,255,0.4)', fontSize:'13px', textAlign:'center' },
  notifItem:   { padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'10px', alignItems:'flex-start' },
  notifDot:    { width:'8px', height:'8px', borderRadius:'50%', flexShrink:0, marginTop:'4px' },
  notifMsg:    { color:'rgba(255,255,255,0.85)', fontSize:'12px', lineHeight:1.4 },
  notifTime:   { color:'rgba(255,255,255,0.35)', fontSize:'11px', marginTop:'3px' },
  composeArea: { padding:'12px 12px 6px' },
  composeBtn:  { width:'100%', padding:'10px 14px', background:'#0078d4', color:'white', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px' },
  nav:         { flex:1, overflowY:'auto', padding:'6px 8px' },
  navLabel:    { display:'block', padding:'6px 10px 4px', fontSize:'10px', fontWeight:'600', color:'rgba(255,255,255,0.35)', letterSpacing:'0.8px' },
  navItem:     { width:'100%', padding:'8px 10px', background:'transparent', border:'none', color:'rgba(255,255,255,0.72)', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', textAlign:'left', marginBottom:'1px', transition:'background 0.1s' },
  navItemActive:{ background:'#0078d4', color:'white', fontWeight:'500' },
  navIcon:     { fontSize:'14px', width:'18px', textAlign:'center' },
  navItemLabel:{ flex:1 },
  badge:       { background:'rgba(255,255,255,0.22)', color:'white', borderRadius:'10px', padding:'1px 7px', fontSize:'11px', fontWeight:'700' },
  foldersHeader:{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingRight:'4px', marginTop:'4px' },
  newFolderBtn: { background:'transparent', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:'16px', padding:'2px 6px', borderRadius:'4px' },
  newFolderForm:{ background:'rgba(255,255,255,0.06)', borderRadius:'8px', padding:'10px', margin:'4px 2px 6px', display:'flex', flexDirection:'column', gap:'8px' },
  newFolderInput:{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', padding:'7px 10px', color:'white', fontSize:'13px', outline:'none' },
  colorRow:     { display:'flex', gap:'5px', flexWrap:'wrap' },
  colorDot:     { width:'18px', height:'18px', borderRadius:'50%', border:'none', cursor:'pointer', flexShrink:0 },
  folderError:  { fontSize:'11px', color:'#ff8585' },
  createFolderBtn:{ padding:'7px 0', background:'#0078d4', color:'white', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  folderItem:   { display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px', borderRadius:'6px', cursor:'pointer', color:'rgba(255,255,255,0.72)', fontSize:'13px', marginBottom:'1px', position:'relative' },
  folderItemActive:{ background:'#0078d4', color:'white' },
  folderItemDrag:  { background:'rgba(255,255,255,0.18)', outline:'1px dashed rgba(255,255,255,0.5)' },
  folderDot:    { width:'9px', height:'9px', borderRadius:'50%', flexShrink:0 },
  folderName:   { flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  folderActions:{ display:'flex', gap:'2px' },
  folderActionBtn:{ background:'transparent', border:'none', cursor:'pointer', fontSize:'11px', padding:'2px 3px', borderRadius:'3px', color:'rgba(255,255,255,0.6)' },
  renamingRow:  { display:'flex', alignItems:'center', gap:'4px', padding:'4px 8px', marginBottom:'2px' },
  renameInput:  { flex:1, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'4px', padding:'5px 8px', color:'white', fontSize:'12px', outline:'none' },
  renameOk:     { background:'#107c10', border:'none', borderRadius:'4px', color:'white', cursor:'pointer', padding:'4px 8px', fontSize:'12px' },
  renameCancel: { background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:'4px 8px', fontSize:'12px' },
  noFolders:    { fontSize:'11px', color:'rgba(255,255,255,0.3)', padding:'6px 10px', fontStyle:'italic' },
  footer:       { padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', gap:'8px', background:'rgba(0,0,0,0.15)' },
  footerAvatar: { width:'30px', height:'30px', borderRadius:'50%', background:'#0078d4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' },
  footerIcons:  { display:'flex', alignItems:'center', gap:'2px', flexShrink:0 },
  footerIconBtn:{ background:'transparent', border:'none', color:'rgba(255,255,255,0.55)', cursor:'pointer', fontSize:'14px', padding:'5px 4px', borderRadius:'5px', lineHeight:1 },
  logoutBtn:    { background:'rgba(209,52,56,0.15)', border:'1px solid rgba(209,52,56,0.3)', color:'#ff8585', cursor:'pointer', fontSize:'13px', padding:'5px 7px', borderRadius:'5px', lineHeight:1, fontWeight:'600', transition:'all 0.15s' },
  userInfo:     { flex:1, minWidth:0 },
  userName:     { color:'white', fontSize:'12px', fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  userEmail:    { color:'rgba(255,255,255,0.4)', fontSize:'10px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
};
