import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function SignaturePage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '', designation: '', company: '',
    phone: '', regards: 'Best Regards', isEnabled: true,
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.get('/signature')
      .then(({ data }) => {
        if (data.signature) {
          setForm({
            name:        data.signature.name        || user?.name || '',
            designation: data.signature.designation || '',
            company:     data.signature.company     || '',
            phone:       data.signature.phone       || '',
            regards:     data.signature.regards     || 'Best Regards',
            isEnabled:   data.signature.isEnabled   !== false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/signature', form);
      showToast('✅ Signature saved successfully');
    } catch { showToast('Failed to save signature', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove your email signature?')) return;
    try {
      await api.delete('/signature');
      setForm({ name:'', designation:'', company:'', phone:'', regards:'Best Regards', isEnabled:true });
      showToast('Signature removed');
    } catch { showToast('Failed to remove signature', 'error'); }
  };

  // Live preview HTML
  const previewHtml = `
    <div style="font-family:'Segoe UI',sans-serif;color:#201f1e;margin-top:24px;padding-top:16px;border-top:2px solid #0078d4;max-width:400px">
      <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0078d4">${form.regards || 'Best Regards'},</p>
      <p style="margin:0 0 2px;font-size:14px;font-weight:600">${form.name || 'Your Name'}</p>
      ${form.designation ? `<p style="margin:0 0 2px;font-size:13px;color:#605e5c">${form.designation}</p>` : ''}
      ${form.company     ? `<p style="margin:0 0 2px;font-size:13px;color:#605e5c">${form.company}</p>`     : ''}
      ${form.phone       ? `<p style="margin:0;font-size:12px;color:#a19f9d">📞 ${form.phone}</p>`         : ''}
    </div>`;

  if (loading) return <div style={S.loading}>Loading…</div>;

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={S.title}>✍️ Email Signature</h1>
      </div>

      <div style={S.content}>
        {/* Left: Form */}
        <div style={S.card}>
          <div style={S.cardTitle}>Signature Settings</div>

          <div style={S.enableRow}>
            <label style={S.enableLabel}>
              <input type="checkbox" checked={form.isEnabled}
                onChange={e => setForm(f => ({ ...f, isEnabled: e.target.checked }))}
                style={{ marginRight:'8px' }} />
              Enable signature on all outgoing emails
            </label>
          </div>

          <div style={S.grid}>
            <Field label="Display Name"  value={form.name}        onChange={v => setForm(f=>({...f,name:v}))}        placeholder="Your full name" />
            <Field label="Designation"   value={form.designation} onChange={v => setForm(f=>({...f,designation:v}))} placeholder="e.g. Senior Engineer" />
            <Field label="Company"       value={form.company}     onChange={v => setForm(f=>({...f,company:v}))}     placeholder="Company name" />
            <Field label="Phone Number"  value={form.phone}       onChange={v => setForm(f=>({...f,phone:v}))}       placeholder="+91 98765 43210" />
            <Field label="Regards Text"  value={form.regards}     onChange={v => setForm(f=>({...f,regards:v}))}     placeholder="Best Regards" />
          </div>

          <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
            <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Signature'}
            </button>
            <button style={S.deleteBtn} onClick={handleDelete}>Remove</button>
          </div>
        </div>

        {/* Right: Preview */}
        <div style={S.card}>
          <div style={S.cardTitle}>Live Preview</div>
          <div style={S.previewWrap}>
            <p style={{ fontSize:'13px', color:'#605e5c', marginBottom:'12px' }}>
              This is how your signature will appear at the bottom of outgoing emails:
            </p>
            <div style={S.previewBox} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
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

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
      <label style={{ fontSize:'12px', fontWeight:'600', color:'#605e5c', letterSpacing:'0.3px' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding:'9px 12px', border:'1px solid #e1dfdd', borderRadius:'6px', fontSize:'13px', outline:'none' }}
        onFocus={e => e.target.style.borderColor='#0078d4'}
        onBlur={e  => e.target.style.borderColor='#e1dfdd'} />
    </div>
  );
}

const S = {
  page:    { minHeight:'100vh', background:'#f3f2f1', fontFamily:"'Inter','Segoe UI',sans-serif" },
  topBar:  { display:'flex', alignItems:'center', gap:'16px', padding:'16px 24px', background:'white', borderBottom:'1px solid #e1dfdd' },
  backBtn: { padding:'8px 16px', background:'transparent', border:'1px solid #e1dfdd', borderRadius:'6px', cursor:'pointer', fontSize:'13px', color:'#605e5c' },
  title:   { fontSize:'20px', fontWeight:'700', color:'#201f1e' },
  loading: { padding:'80px', textAlign:'center', color:'#a19f9d' },
  content: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', padding:'24px', maxWidth:'1000px', margin:'0 auto' },
  card:    { background:'white', borderRadius:'12px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.07)', border:'1px solid #e1dfdd' },
  cardTitle:{ fontSize:'15px', fontWeight:'700', color:'#201f1e', marginBottom:'18px', paddingBottom:'12px', borderBottom:'1px solid #f3f2f1' },
  enableRow:{ marginBottom:'18px' },
  enableLabel:{ display:'flex', alignItems:'center', fontSize:'13px', color:'#323130', cursor:'pointer', userSelect:'none' },
  grid:    { display:'flex', flexDirection:'column', gap:'14px' },
  saveBtn: { padding:'10px 22px', background:'#0078d4', color:'white', border:'none', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  deleteBtn:{ padding:'10px 16px', background:'transparent', color:'#d13438', border:'1px solid #d13438', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  previewWrap:{ padding:'0' },
  previewBox:{ border:'1px solid #e1dfdd', borderRadius:'8px', padding:'20px', background:'#fafafa' },
  toast:   { position:'fixed', bottom:'24px', right:'24px', color:'white', padding:'13px 22px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', zIndex:3000 },
};
