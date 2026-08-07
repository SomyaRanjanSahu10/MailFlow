import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function TrashPage() {
  const [emails,   setEmails]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  const [confirmId,setConfirmId]= useState(null); // id to permanently delete
  const navigate = useNavigate();

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/email/trash'); setEmails(data.emails || []); }
    catch { showToast('Failed to load trash', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  // Restore email back to inbox/sent
  const handleRestore = async (id) => {
    try {
      await api.patch(`/email/restore/${id}`);
      setEmails(p => p.filter(e => e._id !== id));
      showToast('✅ Email restored', 'success');
    } catch { showToast('Failed to restore', 'error'); }
  };

  // Permanent delete — triggered after confirmation modal
  const handlePermanentDelete = async (id) => {
    setConfirmId(null);
    try {
      await api.delete(`/email/permanent/${id}`);
      setEmails(p => p.filter(e => e._id !== id));
      showToast('🗑️ Permanently deleted', 'success');
    } catch { showToast('Failed to delete', 'error'); }
  };

  // Empty entire trash
  const handleEmptyTrash = async () => {
    if (!window.confirm('Permanently delete ALL emails in Trash? This cannot be undone.')) return;
    try {
      await Promise.all(emails.map(e => api.delete(`/email/permanent/${e._id}`)));
      setEmails([]);
      showToast('🗑️ Trash emptied', 'success');
    } catch { showToast('Failed to empty trash', 'error'); }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  // Days left before auto-delete (30-day policy)
  const daysLeft = (trashedAt) => {
    if (!trashedAt) return 30;
    const diff = 30 - Math.floor((Date.now() - new Date(trashedAt)) / 86400000);
    return Math.max(0, diff);
  };

  return (
    <div style={S.page}>
      {/* Sidebar-style back button */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate('/')}>← Back to Mail</button>
        <h1 style={S.pageTitle}>🗑️ Trash</h1>
        {emails.length > 0 && (
          <button style={S.emptyBtn} onClick={handleEmptyTrash}>Empty Trash</button>
        )}
      </div>

      <div style={S.notice}>
        Emails in Trash are automatically deleted after <strong>30 days</strong>.
      </div>

      {loading ? (
        <div style={S.loading}>Loading trash…</div>
      ) : emails.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize:'64px', marginBottom:'16px' }}>🗑️</div>
          <p style={{ fontSize:'18px', fontWeight:'600', color:'#605e5c' }}>Trash is empty</p>
          <p style={{ color:'#a19f9d', fontSize:'13px' }}>Deleted emails appear here</p>
        </div>
      ) : (
        <div style={S.list}>
          {emails.map(email => {
            const days = daysLeft(email.trashedAt);
            return (
              <div key={email._id} style={S.item}>
                <div style={S.itemMeta}>
                  <div style={S.itemFrom}>
                    {email.sender?.name || email.sender?.email || 'Unknown'}
                    <span style={S.itemEmail}> &lt;{email.sender?.email}&gt;</span>
                  </div>
                  <div style={S.itemSubject}>{email.subject}</div>
                  <div style={S.itemDate}>
                    Deleted {fmt(email.trashedAt || email.updatedAt)}
                    <span style={{ ...S.daysBadge, color: days <= 3 ? '#d13438' : '#605e5c' }}>
                      {days}d left
                    </span>
                  </div>
                </div>
                <div style={S.itemActions}>
                  <button style={S.restoreBtn} onClick={() => handleRestore(email._id)}>
                    ↩️ Restore
                  </button>
                  <button style={S.deleteBtn} onClick={() => setConfirmId(email._id)}>
                    🗑️ Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmId && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>⚠️</div>
            <h3 style={{ fontSize:'18px', fontWeight:'700', color:'#201f1e', marginBottom:'8px' }}>
              Permanently Delete?
            </h3>
            <p style={{ color:'#605e5c', fontSize:'14px', marginBottom:'24px', lineHeight:1.5 }}>
              This action <strong>cannot be undone</strong>. The email will be permanently removed from all devices.
            </p>
            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
              <button style={S.cancelModalBtn} onClick={() => setConfirmId(null)}>Cancel</button>
              <button style={S.confirmModalBtn} onClick={() => handlePermanentDelete(confirmId)}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type==='error'?'#d13438':toast.type==='success'?'#107c10':'#0078d4' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const S = {
  page:    { minHeight:'100vh', background:'#f3f2f1', fontFamily:"'Inter','Segoe UI',sans-serif" },
  topBar:  { display:'flex', alignItems:'center', gap:'16px', padding:'16px 24px', background:'white', borderBottom:'1px solid #e1dfdd', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  backBtn: { padding:'8px 16px', background:'transparent', border:'1px solid #e1dfdd', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#605e5c', fontWeight:'500' },
  pageTitle:{ fontSize:'20px', fontWeight:'700', color:'#201f1e', flex:1 },
  emptyBtn:{ padding:'8px 16px', background:'#d13438', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  notice:  { margin:'16px 24px', padding:'12px 16px', background:'#fff4ce', border:'1px solid #ffd966', borderRadius:'8px', fontSize:'13px', color:'#7a5f00' },
  loading: { padding:'60px', textAlign:'center', color:'#a19f9d', fontSize:'15px' },
  empty:   { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', textAlign:'center' },
  list:    { padding:'16px 24px', display:'flex', flexDirection:'column', gap:'8px' },
  item:    { background:'white', borderRadius:'10px', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid #e1dfdd' },
  itemMeta:{ flex:1, minWidth:0 },
  itemFrom:{ fontSize:'14px', fontWeight:'600', color:'#201f1e', marginBottom:'3px' },
  itemEmail:{ fontWeight:'400', color:'#605e5c', fontSize:'12px' },
  itemSubject:{ fontSize:'13px', color:'#323130', marginBottom:'4px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  itemDate:{ fontSize:'11px', color:'#a19f9d', display:'flex', alignItems:'center', gap:'8px' },
  daysBadge:{ fontSize:'11px', fontWeight:'600', background:'#f3f2f1', padding:'1px 6px', borderRadius:'10px' },
  itemActions:{ display:'flex', gap:'8px', flexShrink:0, marginLeft:'16px' },
  restoreBtn:{ padding:'7px 14px', background:'#0078d4', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  deleteBtn: { padding:'7px 14px', background:'transparent', color:'#d13438', border:'1px solid #d13438', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  overlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 },
  modal:    { background:'white', borderRadius:'14px', padding:'36px 40px', maxWidth:'380px', width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' },
  cancelModalBtn: { padding:'10px 24px', background:'#f3f2f1', color:'#323130', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'14px', fontWeight:'500' },
  confirmModalBtn:{ padding:'10px 24px', background:'#d13438', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
  toast:   { position:'fixed', bottom:'24px', right:'24px', color:'white', padding:'13px 22px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:3000, maxWidth:'360px' },
};
