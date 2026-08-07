import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileRef  = useRef();

  const [form, setForm] = useState({
    name:'', designation:'', department:'', phone:'', bio:'',
  });
  const [avatar,   setAvatar]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    api.get('/profile')
      .then(({ data }) => {
        const u = data.user;
        setForm({ name:u.name||'', designation:u.designation||'', department:u.department||'', phone:u.phone||'', bio:u.bio||'' });
        setAvatar(u.avatar || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/profile', form);
      // Update user in localStorage
      const updated = { ...user, name: data.user.name };
      localStorage.setItem('mf_user', JSON.stringify(updated));
      setUser(updated);
      showToast('✅ Profile updated');
    } catch { showToast('Failed to update profile', 'error'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('Image must be under 5 MB', 'error');
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const { data } = await api.post('/profile/avatar', fd);
      setAvatar(data.avatar);
      const updated = { ...user, avatar: data.avatar };
      localStorage.setItem('mf_user', JSON.stringify(updated));
      setUser(updated);
      showToast('✅ Profile picture updated');
    } catch { showToast('Failed to upload image', 'error'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const initials = form.name ? form.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '??';

  if (loading) return <div style={S.loading}>Loading profile…</div>;

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={S.title}>👤 My Profile</h1>
      </div>

      <div style={S.content}>
        {/* Avatar card */}
        <div style={S.avatarCard}>
          <div style={S.avatarWrap}>
            {avatar
              ? <img src={avatar} alt="avatar" style={S.avatarImg}/>
              : <div style={S.avatarPlaceholder}>{initials}</div>
            }
            {uploading && <div style={S.avatarOverlay}>Uploading…</div>}
          </div>
          <button style={S.uploadBtn} onClick={() => fileRef.current.click()} disabled={uploading}>
            📷 {uploading ? 'Uploading…' : 'Change Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload}/>
          <p style={S.uploadHint}>JPG, PNG, GIF — max 5 MB</p>

          <div style={S.profileCard}>
            <div style={S.pcName}>{form.name || user?.name}</div>
            {form.designation && <div style={S.pcDesig}>{form.designation}</div>}
            {form.department  && <div style={S.pcDept}>{form.department}</div>}
            <div style={S.pcEmail}>{user?.email}</div>
            {form.phone       && <div style={S.pcPhone}>📞 {form.phone}</div>}
          </div>
        </div>

        {/* Form card */}
        <div style={S.formCard}>
          <div style={S.cardTitle}>Edit Profile Information</div>
          <div style={S.grid}>
            <Field label="Full Name"    value={form.name}        onChange={v=>setForm(f=>({...f,name:v}))}        placeholder="Your full name" />
            <Field label="Email"        value={user?.email||''}  onChange={()=>{}}                                placeholder="" disabled />
            <Field label="Designation"  value={form.designation} onChange={v=>setForm(f=>({...f,designation:v}))} placeholder="e.g. Senior Developer" />
            <Field label="Department"   value={form.department}  onChange={v=>setForm(f=>({...f,department:v}))}  placeholder="e.g. Engineering" />
            <Field label="Phone Number" value={form.phone}       onChange={v=>setForm(f=>({...f,phone:v}))}       placeholder="+91 98765 43210" />
          </div>
          <div style={{ marginTop:'14px', display:'flex', flexDirection:'column', gap:'5px' }}>
            <label style={S.fieldLabel}>Bio / About</label>
            <textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))}
              placeholder="A brief introduction about yourself…"
              rows={3} style={S.textarea}/>
          </div>
          <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ ...S.toast, background: toast.type==='error'?'#d13438':'#107c10' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
      <label style={{ fontSize:'12px', fontWeight:'600', color:'#605e5c' }}>{label}</label>
      <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled}
        style={{ padding:'9px 12px', border:'1px solid #e1dfdd', borderRadius:'6px', fontSize:'13px', outline:'none',
          background: disabled?'#f3f2f1':'white', color: disabled?'#a19f9d':'#201f1e' }}
        onFocus={e => !disabled && (e.target.style.borderColor='#0078d4')}
        onBlur={e  => (e.target.style.borderColor='#e1dfdd')} />
    </div>
  );
}

const S = {
  page:    { minHeight:'100vh', background:'#f3f2f1', fontFamily:"'Inter','Segoe UI',sans-serif" },
  topBar:  { display:'flex', alignItems:'center', gap:'16px', padding:'16px 24px', background:'white', borderBottom:'1px solid #e1dfdd' },
  backBtn: { padding:'8px 16px', background:'transparent', border:'1px solid #e1dfdd', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#605e5c' },
  title:   { fontSize:'20px', fontWeight:'700', color:'#201f1e' },
  loading: { padding:'80px', textAlign:'center', color:'#a19f9d' },
  content: { display:'grid', gridTemplateColumns:'280px 1fr', gap:'20px', padding:'24px', maxWidth:'900px', margin:'0 auto' },
  avatarCard:{ background:'white', borderRadius:'12px', padding:'28px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', border:'1px solid #e1dfdd', height:'fit-content' },
  avatarWrap:{ position:'relative', width:'100px', height:'100px' },
  avatarImg: { width:'100px', height:'100px', borderRadius:'50%', objectFit:'cover', border:'3px solid #0078d4' },
  avatarPlaceholder:{ width:'100px', height:'100px', borderRadius:'50%', background:'#0078d4', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:'700', border:'3px solid #deecf9' },
  avatarOverlay:{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'12px', fontWeight:'600' },
  uploadBtn: { padding:'8px 18px', background:'#0078d4', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  uploadHint:{ fontSize:'11px', color:'#a19f9d', textAlign:'center' },
  profileCard:{ width:'100%', background:'#f8f8f8', borderRadius:'10px', padding:'16px', border:'1px solid #e1dfdd', marginTop:'8px' },
  pcName:  { fontSize:'15px', fontWeight:'700', color:'#201f1e', marginBottom:'4px', textAlign:'center' },
  pcDesig: { fontSize:'12px', color:'#0078d4', textAlign:'center', fontWeight:'500' },
  pcDept:  { fontSize:'12px', color:'#605e5c', textAlign:'center' },
  pcEmail: { fontSize:'11px', color:'#a19f9d', textAlign:'center', marginTop:'4px' },
  pcPhone: { fontSize:'11px', color:'#605e5c', textAlign:'center' },
  formCard:{ background:'white', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', border:'1px solid #e1dfdd' },
  cardTitle:{ fontSize:'15px', fontWeight:'700', color:'#201f1e', marginBottom:'18px', paddingBottom:'12px', borderBottom:'1px solid #f3f2f1' },
  grid:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' },
  fieldLabel:{ fontSize:'12px', fontWeight:'600', color:'#605e5c' },
  textarea:{ padding:'9px 12px', border:'1px solid #e1dfdd', borderRadius:'6px', fontSize:'13px', outline:'none', resize:'vertical', fontFamily:"inherit" },
  saveBtn: { marginTop:'20px', padding:'11px 24px', background:'#0078d4', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
  toast:   { position:'fixed', bottom:'24px', right:'24px', color:'white', padding:'13px 22px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:3000 },
};
