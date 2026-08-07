import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Feature 5: Multi-account switcher dropdown
export default function AccountSwitcher() {
  const { user, accounts, switchAccount, addAccount, logout } = useAuth();
  const [open,    setOpen]    = useState(false);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ email:'', password:'', label:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async e => {
    e.preventDefault(); setError('');
    if (!form.email || !form.password) return setError('Email and password required');
    setLoading(true);
    try {
      await addAccount(form.email, form.password, form.label || 'Secondary');
      setAdding(false); setForm({ email:'', password:'', label:'' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add account');
    } finally { setLoading(false); }
  };

  const initials = user?.name
    ? user.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '??';

  const otherAccounts = accounts.filter(a => a.user.id !== user?.id);

  return (
    <div style={{ position:'relative' }}>
      {/* Trigger */}
      <button style={S.trigger} onClick={() => setOpen(v => !v)}>
        {user?.avatar
          ? <img src={user.avatar} alt="" style={S.triggerImg}/>
          : <div style={S.triggerAv}>{initials}</div>}
        <span style={S.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={S.panel}>
          {/* Current account */}
          <div style={S.currentSection}>
            <div style={S.label}>SIGNED IN AS</div>
            <div style={S.accountRow}>
              {user?.avatar
                ? <img src={user.avatar} alt="" style={S.av}/>
                : <div style={{ ...S.avFallback, background:'#0078d4' }}>{initials}</div>}
              <div>
                <div style={S.acName}>{user?.name}</div>
                <div style={S.acEmail}>{user?.email}</div>
              </div>
              <span style={S.activeDot}>●</span>
            </div>
          </div>

          {/* Other accounts */}
          {otherAccounts.length > 0 && (
            <div style={S.section}>
              <div style={S.label}>OTHER ACCOUNTS</div>
              {otherAccounts.map((acc, i) => {
                const ini = acc.user.name?.split(' ').map(n=>n[0]).join('').slice(0,2) || '??';
                const colors = ['#107c10','#8764b8','#ca5010','#038387'];
                return (
                  <div key={i} style={S.accountRow}
                    onClick={() => { setOpen(false); switchAccount(acc); }}>
                    {acc.user.avatar
                      ? <img src={acc.user.avatar} alt="" style={S.av}/>
                      : <div style={{ ...S.avFallback, background: colors[i % colors.length] }}>{ini}</div>}
                    <div>
                      <div style={S.acName}>{acc.user.name}</div>
                      <div style={S.acEmail}>{acc.user.email}</div>
                    </div>
                    <span style={S.switchBtn}>Switch →</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={S.divider}/>

          {/* Add account */}
          {!adding ? (
            <button style={S.addBtn} onClick={() => setAdding(true)}>
              ＋ Add another account
            </button>
          ) : (
            <form onSubmit={handleAdd} style={S.addForm}>
              <div style={S.addTitle}>Add Account</div>
              {error && <div style={S.errMsg}>{error}</div>}
              <Inp type="email"    value={form.email}    onChange={v=>setForm(f=>({...f,email:v}))}    placeholder="Email" />
              <Inp type="password" value={form.password} onChange={v=>setForm(f=>({...f,password:v}))} placeholder="Password" />
              <Inp type="text"     value={form.label}    onChange={v=>setForm(f=>({...f,label:v}))}    placeholder='Label (e.g. "Work")' />
              <div style={{ display:'flex', gap:'6px', marginTop:'4px' }}>
                <button type="submit" disabled={loading} style={S.addSubmit}>
                  {loading ? '…' : 'Add'}
                </button>
                <button type="button" style={S.addCancel}
                  onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
              </div>
            </form>
          )}

          <div style={S.divider}/>
          <button style={S.signOutBtn} onClick={() => { setOpen(false); logout(); }}>
            ⎋ Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Inp({ type, value, onChange, placeholder }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ padding:'7px 10px', border:'1px solid #e1dfdd', borderRadius:'5px', fontSize:'12px',
        outline:'none', width:'100%', boxSizing:'border-box', marginBottom:'6px' }}
      onFocus={e=>e.target.style.borderColor='#0078d4'}
      onBlur={e=>e.target.style.borderColor='#e1dfdd'} />
  );
}

const S = {
  trigger:       { background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', padding:'3px' },
  triggerImg:    { width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(255,255,255,0.6)' },
  triggerAv:     { width:'28px', height:'28px', borderRadius:'50%', background:'#0078d4', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700' },
  chevron:       { color:'rgba(255,255,255,0.7)', fontSize:'9px' },
  panel:         { position:'absolute', bottom:'100%', right:0, width:'280px', background:'white', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.2)', border:'1px solid #e1dfdd', overflow:'hidden', marginBottom:'6px', zIndex:600 },
  currentSection:{ padding:'14px 16px', background:'#f8f8f8', borderBottom:'1px solid #e1dfdd' },
  section:       { padding:'10px 16px' },
  label:         { fontSize:'10px', fontWeight:'700', color:'#a19f9d', letterSpacing:'0.8px', marginBottom:'8px' },
  accountRow:    { display:'flex', alignItems:'center', gap:'10px', padding:'6px 0', cursor:'pointer', borderRadius:'6px' },
  av:            { width:'34px', height:'34px', borderRadius:'50%', objectFit:'cover', flexShrink:0 },
  avFallback:    { width:'34px', height:'34px', borderRadius:'50%', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', flexShrink:0 },
  acName:        { fontSize:'13px', fontWeight:'600', color:'#201f1e' },
  acEmail:       { fontSize:'11px', color:'#605e5c' },
  activeDot:     { color:'#107c10', fontSize:'10px', marginLeft:'auto', flexShrink:0 },
  switchBtn:     { fontSize:'11px', color:'#0078d4', marginLeft:'auto', fontWeight:'600', flexShrink:0 },
  divider:       { height:'1px', background:'#e1dfdd', margin:'4px 0' },
  addBtn:        { width:'100%', padding:'10px 16px', background:'transparent', border:'none', color:'#0078d4', fontSize:'13px', fontWeight:'600', cursor:'pointer', textAlign:'left' },
  addForm:       { padding:'10px 16px' },
  addTitle:      { fontSize:'13px', fontWeight:'700', color:'#201f1e', marginBottom:'10px' },
  errMsg:        { fontSize:'12px', color:'#d13438', marginBottom:'8px' },
  addSubmit:     { flex:1, padding:'7px', background:'#0078d4', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  addCancel:     { padding:'7px 12px', background:'transparent', color:'#605e5c', border:'1px solid #e1dfdd', borderRadius:'5px', cursor:'pointer', fontSize:'12px' },
  signOutBtn:    { width:'100%', padding:'10px 16px', background:'transparent', border:'none', color:'#d13438', fontSize:'13px', fontWeight:'600', cursor:'pointer', textAlign:'left' },
};
