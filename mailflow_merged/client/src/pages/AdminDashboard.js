import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const TABS = [
  { id:'dashboard', label:'📊 Dashboard' },
  { id:'users',     label:'👥 Users'      },
  { id:'emails',    label:'📧 Emails'     },
  { id:'logs',      label:'📋 Admin Logs' },
  { id:'activity',  label:'📈 Activity'   },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab,    setTab]    = useState('dashboard');
  const [stats,  setStats]  = useState(null);
  const [users,  setUsers]  = useState([]);
  const [emails, setEmails] = useState([]);
  const [logs,   setLogs]   = useState([]);
  const [activity,setActivity]=useState([]);
  const [loading,setLoading]= useState(false);
  const [search, setSearch] = useState('');
  const [toast,  setToast]  = useState(null);
  // Pagination
  const [page,   setPage]   = useState(1);
  const [pages,  setPages]  = useState(1);
  const [total,  setTotal]  = useState(0);
  // Reset password modal
  const [resetModal, setResetModal] = useState(null); // { userId, name }
  const [newPassword, setNewPassword] = useState('');

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const { data } = await api.get('/admin/dashboard');
        setStats(data.stats);
        setEmails(data.recentEmails || []);
        setLogs(data.recentLogs || []);
        setActivity(data.activityLogs || []);
      } else if (tab === 'users') {
        const { data } = await api.get(`/admin/users?search=${search}&page=${page}&limit=15`);
        setUsers(data.users || []); setTotal(data.total||0); setPages(data.pages||1);
      } else if (tab === 'emails') {
        const { data } = await api.get(`/admin/emails?page=${page}&limit=15`);
        setEmails(data.emails || []); setTotal(data.total||0); setPages(data.pages||1);
      } else if (tab === 'logs') {
        const { data } = await api.get(`/admin/logs?page=${page}&limit=20`);
        setLogs(data.logs || []); setTotal(data.total||0); setPages(data.pages||1);
      } else if (tab === 'activity') {
        const { data } = await api.get(`/admin/activity?page=${page}&limit=20`);
        setActivity(data.logs || []); setTotal(data.total||0); setPages(data.pages||1);
      }
    } catch (err) {
      if (err.response?.status === 403) { navigate('/'); return; }
      showToast('Failed to load data', 'error');
    } finally { setLoading(false); }
  }, [tab, search, page, navigate]);

  useEffect(() => { setPage(1); }, [tab, search]);
  useEffect(() => { load(); }, [load]);

  const handleToggleUser = async (userId) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/toggle-active`);
      setUsers(p => p.map(u => u._id===userId ? {...u, isActive:data.isActive} : u));
      showToast(data.isActive ? 'User activated' : 'User suspended');
    } catch (err) { showToast(err.response?.data?.message||'Failed','error'); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(p => p.filter(u => u._id!==userId));
      showToast('User deleted');
    } catch (err) { showToast(err.response?.data?.message||'Failed','error'); }
  };

  const handleMakeAdmin = async (userId) => {
    if (!window.confirm('Promote this user to admin?')) return;
    try {
      await api.patch(`/admin/users/${userId}/make-admin`);
      setUsers(p => p.map(u => u._id===userId ? {...u, role:'admin'} : u));
      showToast('Promoted to admin');
    } catch { showToast('Failed','error'); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return showToast('Min. 6 characters','error');
    try {
      await api.patch(`/admin/users/${resetModal.userId}/reset-password`, { newPassword });
      setResetModal(null); setNewPassword('');
      showToast(`Password reset for ${resetModal.name}`);
    } catch (err) { showToast(err.response?.data?.message||'Failed','error'); }
  };

  const handleDeleteEmail = async (emailId) => {
    if (!window.confirm('Permanently delete this email?')) return;
    try {
      await api.delete(`/admin/emails/${emailId}`);
      setEmails(p => p.filter(e => e._id!==emailId));
      showToast('Email deleted');
    } catch { showToast('Failed','error'); }
  };

  const fmt = d => new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sideHeader}>
          <div style={{ fontSize:'22px', marginBottom:'4px' }}>✉️</div>
          <div style={{ color:'white', fontWeight:'700', fontSize:'16px' }}>MailFlow</div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'11px' }}>Admin Panel</div>
        </div>
        <nav style={{ flex:1, padding:'10px 8px' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...S.navBtn, ...(tab===t.id ? S.navBtnActive : {}) }}>
              {t.label}
            </button>
          ))}
        </nav>
        <div style={S.sideFooter}>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:'12px', marginBottom:'8px' }}>
            {user?.name}
            <span style={{ display:'block', color:'rgba(255,255,255,0.4)', fontSize:'10px' }}>{user?.email}</span>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={() => navigate('/')} style={S.footerBtn}>← App</button>
            <button onClick={logout}              style={S.footerBtn}>Sign out</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <div style={S.topBar}>
          <h1 style={S.pageTitle}>{TABS.find(t=>t.id===tab)?.label}</h1>
          {tab==='users' && (
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search users…" style={S.searchInp}/>
          )}
          <button onClick={load} style={S.refreshBtn} title="Refresh">🔄 Refresh</button>
        </div>

        <div style={{ flex:1, overflow:'auto', padding:'0 24px 24px' }}>
          {loading && <div style={{ padding:'40px', textAlign:'center', color:'#a19f9d' }}>Loading…</div>}

          {/* ── Dashboard Tab ── */}
          {!loading && tab==='dashboard' && stats && (
            <>
              {/* Stat cards */}
              <div style={S.statsGrid}>
                {[
                  { label:'Total Users',    value:stats.totalUsers,  icon:'👥', color:'#0078d4' },
                  { label:'Active Users',   value:stats.activeUsers, icon:'✅', color:'#107c10' },
                  { label:'Emails Sent',    value:stats.totalEmails, icon:'📧', color:'#8764b8' },
                  { label:'Sent Today',     value:stats.sentToday,   icon:'🚀', color:'#ca5010' },
                  { label:'In Trash',       value:stats.trashCount,  icon:'🗑️', color:'#d13438' },
                  { label:'Deleted Perma.',value:stats.deletedCount, icon:'⚠️', color:'#a19f9d' },
                ].map(c => (
                  <div key={c.label} style={{ ...S.statCard, borderTop:`4px solid ${c.color}` }}>
                    <div style={{ fontSize:'26px', marginBottom:'6px' }}>{c.icon}</div>
                    <div style={{ fontSize:'30px', fontWeight:'700', color:c.color }}>{c.value ?? '—'}</div>
                    <div style={{ fontSize:'12px', color:'#605e5c', marginTop:'4px' }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <h3 style={S.sectionTitle}>Recent Emails</h3>
              <DataTable
                cols={['Subject','From','To','Date','SMTP']}
                rows={(emails||[]).slice(0,8).map(e=>[
                  e.subject||'(no subject)',
                  e.sender?.email||'—',
                  e.receiver?.email||'—',
                  fmt(e.createdAt),
                  e.smtpSent ? <span style={{ color:'#107c10', fontSize:'12px' }}>✅</span>
                             : <span style={{ color:'#a19f9d', fontSize:'12px' }}>—</span>,
                ])} emptyMsg="No recent emails"/>
            </>
          )}

          {/* ── Users Tab ── */}
          {!loading && tab==='users' && (
            <>
              <DataTable
                cols={['Name','Email','Role','Status','Last Login','Actions']}
                rows={users.map(u=>[
                  u.name,
                  u.email,
                  <RoleBadge role={u.role}/>,
                  <StatusBadge active={u.isActive}/>,
                  u.lastLogin ? fmt(u.lastLogin) : 'Never',
                  <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                    {u.role!=='admin' && <>
                      <ActionBtn color={u.isActive?'#ca5010':'#107c10'}
                        onClick={()=>handleToggleUser(u._id)}>
                        {u.isActive?'Suspend':'Activate'}
                      </ActionBtn>
                      <ActionBtn color='#8764b8' onClick={()=>handleMakeAdmin(u._id)}>Admin</ActionBtn>
                      <ActionBtn color='#0078d4' onClick={()=>{ setResetModal({userId:u._id,name:u.name}); setNewPassword(''); }}>
                        🔑 Reset PW
                      </ActionBtn>
                      <ActionBtn color='#d13438' onClick={()=>handleDeleteUser(u._id)}>Delete</ActionBtn>
                    </>}
                  </div>,
                ])} emptyMsg="No users found"/>
              <PaginationBar page={page} pages={pages} total={total} onPage={setPage}/>
            </>
          )}

          {/* ── Emails Tab ── */}
          {!loading && tab==='emails' && (
            <>
              <DataTable
                cols={['Subject','From','To','Date','Attach.','Recalled','Actions']}
                rows={emails.map(e=>[
                  e.subject||'(no subject)',
                  e.sender?.email||'—',
                  e.receiver?.email||'—',
                  fmt(e.createdAt),
                  e.attachments?.length>0 ? `📎 ${e.attachments.length}` : '—',
                  e.isRecalled ? <span style={{color:'#ca5010',fontSize:'12px'}}>↩️ Yes</span>:'—',
                  <ActionBtn color='#d13438' onClick={()=>handleDeleteEmail(e._id)}>Delete</ActionBtn>,
                ])} emptyMsg="No email logs"/>
              <PaginationBar page={page} pages={pages} total={total} onPage={setPage}/>
            </>
          )}

          {/* ── Admin Logs Tab ── */}
          {!loading && tab==='logs' && (
            <>
              <DataTable
                cols={['Action','Admin','Target','Detail','Time']}
                rows={logs.map(l=>[
                  <code style={{ fontSize:'11px', background:'#f3f2f1', padding:'2px 6px', borderRadius:'4px' }}>{l.action}</code>,
                  l.admin?.email||'—',
                  l.target||'—',
                  l.detail||'—',
                  fmt(l.createdAt),
                ])} emptyMsg="No admin logs"/>
              <PaginationBar page={page} pages={pages} total={total} onPage={setPage}/>
            </>
          )}

          {/* ── Activity Tab ── */}
          {!loading && tab==='activity' && (
            <>
              <DataTable
                cols={['Action','User','Detail','Status','Time']}
                rows={activity.map(l=>[
                  <code style={{ fontSize:'11px', background:'#f3f2f1', padding:'2px 6px', borderRadius:'4px' }}>{l.action}</code>,
                  l.user?.email||'System',
                  l.detail||'—',
                  l.success
                    ? <span style={{color:'#107c10',fontSize:'12px',fontWeight:'600'}}>✅</span>
                    : <span style={{color:'#d13438',fontSize:'12px',fontWeight:'600'}}>❌</span>,
                  fmt(l.createdAt),
                ])} emptyMsg="No activity logs"/>
              <PaginationBar page={page} pages={pages} total={total} onPage={setPage}/>
            </>
          )}
        </div>
      </main>

      {/* Reset Password Modal */}
      {resetModal && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h3 style={{ fontSize:'16px', fontWeight:'700', color:'#201f1e', marginBottom:'6px' }}>
              🔑 Reset Password
            </h3>
            <p style={{ fontSize:'13px', color:'#605e5c', marginBottom:'16px' }}>
              Set a new password for <strong>{resetModal.name}</strong>
            </p>
            <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
              placeholder="New password (min. 6 chars)" autoFocus
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #e1dfdd', borderRadius:'7px', fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'14px' }}
              onFocus={e=>e.target.style.borderColor='#0078d4'}
              onBlur={e=>e.target.style.borderColor='#e1dfdd'}/>
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={handleResetPassword}
                style={{ flex:1, padding:'9px', background:'#0078d4', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                Reset Password
              </button>
              <button onClick={()=>{ setResetModal(null); setNewPassword(''); }}
                style={{ padding:'9px 16px', background:'transparent', color:'#605e5c', border:'1px solid #e1dfdd', borderRadius:'7px', cursor:'pointer', fontSize:'13px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ ...S.toast, background: toast.type==='error'?'#d13438':toast.type==='success'?'#107c10':'#0078d4' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DataTable({ cols, rows, emptyMsg }) {
  return (
    <div style={{ overflowX:'auto', borderRadius:'8px', border:'1px solid #e1dfdd', marginTop:'12px' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
        <thead>
          <tr>{cols.map(c=>(
            <th key={c} style={{ padding:'10px 14px', textAlign:'left', background:'#f3f2f1', fontWeight:'600', color:'#323130', borderBottom:'2px solid #e1dfdd', whiteSpace:'nowrap' }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.length===0
            ? <tr><td colSpan={cols.length} style={{ padding:'32px', textAlign:'center', color:'#a19f9d' }}>{emptyMsg}</td></tr>
            : rows.map((row,i)=>(
                <tr key={i} style={{ borderBottom:'1px solid #f3f2f1' }}>
                  {row.map((cell,j)=>(
                    <td key={j} style={{ padding:'10px 14px', color:'#323130', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cell}</td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );
}

function PaginationBar({ page, pages, total, onPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 2px', fontSize:'13px', color:'#605e5c' }}>
      <span>Total: {total}</span>
      <div style={{ display:'flex', gap:'6px' }}>
        <PBtn disabled={page===1}     onClick={()=>onPage(page-1)}>‹</PBtn>
        {[...Array(pages)].map((_,i)=><PBtn key={i} active={i+1===page} onClick={()=>onPage(i+1)}>{i+1}</PBtn>)}
        <PBtn disabled={page===pages} onClick={()=>onPage(page+1)}>›</PBtn>
      </div>
    </div>
  );
}
function PBtn({onClick,disabled,active,children}){ return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',fontSize:'12px',border:active?'none':'1px solid #e1dfdd',background:active?'#0078d4':'white',color:active?'white':disabled?'#a19f9d':'#323130',cursor:disabled?'not-allowed':'pointer'}}>{children}</button>; }
const RoleBadge=({role})=><span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:'700',background:role==='admin'?'#fde7e9':'#deecf9',color:role==='admin'?'#d13438':'#0078d4'}}>{role}</span>;
const StatusBadge=({active})=><span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:'700',background:active?'#dff6dd':'#f3f2f1',color:active?'#107c10':'#a19f9d'}}>{active?'Active':'Suspended'}</span>;
const ActionBtn=({onClick,color,children})=><button onClick={onClick} style={{padding:'4px 10px',background:'transparent',border:`1px solid ${color}`,borderRadius:'5px',color,cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap'}}>{children}</button>;

const S = {
  page:    { display:'flex', height:'100vh', overflow:'hidden', background:'#f3f2f1', fontFamily:"'Inter','Segoe UI',sans-serif" },
  sidebar: { width:'220px', flexShrink:0, background:'linear-gradient(180deg,#0078d4,#003d6b)', display:'flex', flexDirection:'column' },
  sideHeader:{ padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', borderBottom:'1px solid rgba(255,255,255,0.1)' },
  navBtn:       { width:'100%', padding:'10px 12px', background:'transparent', border:'none', color:'rgba(255,255,255,0.75)', borderRadius:'6px', cursor:'pointer', textAlign:'left', fontSize:'13px', marginBottom:'2px' },
  navBtnActive: { background:'rgba(255,255,255,0.16)', color:'white', fontWeight:'600' },
  sideFooter:   { padding:'16px', borderTop:'1px solid rgba(255,255,255,0.1)' },
  footerBtn:    { padding:'6px 12px', background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.8)', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'12px', marginRight:'4px' },
  main:         { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topBar:       { padding:'16px 24px', background:'white', borderBottom:'1px solid #e1dfdd', display:'flex', alignItems:'center', gap:'12px' },
  pageTitle:    { fontSize:'18px', fontWeight:'700', color:'#201f1e', flex:1 },
  searchInp:    { padding:'8px 12px', border:'1px solid #e1dfdd', borderRadius:'6px', fontSize:'13px', outline:'none', width:'200px' },
  refreshBtn:   { padding:'8px 14px', background:'transparent', border:'1px solid #e1dfdd', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#605e5c' },
  statsGrid:    { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', padding:'20px 0 4px' },
  statCard:     { background:'white', borderRadius:'10px', padding:'18px 20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  sectionTitle: { fontSize:'15px', fontWeight:'600', color:'#201f1e', margin:'20px 0 4px' },
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 },
  modal:        { background:'white', borderRadius:'12px', padding:'28px 32px', maxWidth:'380px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' },
  toast:        { position:'fixed', bottom:'24px', right:'24px', color:'white', padding:'12px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:3000, maxWidth:'360px' },
};
