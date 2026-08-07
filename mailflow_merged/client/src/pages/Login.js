import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await login(email, password);
      navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.left}>
        <div style={S.brand}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="rgba(255,255,255,0.15)"/>
            <path d="M8 10h8v8H8zM20 10h8v8h-8zM8 22h8v8H8zM20 22h8v8h-8z" fill="white"/>
          </svg>
          <h1 style={S.brandName}>MailFlow</h1>
          <p style={S.tagline}>Stay connected. Stay productive.</p>
        </div>
        {['Secure JWT authentication','Real-time inbox & notifications','SMTP email sending','Admin dashboard','Forgot password flow'].map((f,i) => (
          <div key={i} style={S.feature}><span style={S.check}>✓</span><span>{f}</span></div>
        ))}
      </div>

      <div style={S.right}>
        <div style={S.card}>
          <h2 style={S.title}>Sign in</h2>
          <p style={S.subtitle}>to continue to MailFlow</p>

          {error && <div style={S.error}><span>⚠</span> {error}</div>}

          <form onSubmit={handleSubmit} style={S.form}>
            <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="user1@test.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Enter your password" />
            <div style={{ textAlign:'right' }}>
              <Link to="/forgot-password" style={S.forgotLink}>Forgot password?</Link>
            </div>
            <Btn loading={loading}>Sign in</Btn>
          </form>

          <div style={S.divider}>Don't have an account? <Link to="/register" style={S.link}>Register</Link></div>

          <div style={S.hints}>
            <p style={S.hintsTitle}>🧪 Test Credentials</p>
            {[['user1@test.com','123456'],['user2@test.com','123456']].map(([e,p]) => (
              <p key={e} style={S.hint} onClick={() => { setEmail(e); setPassword(p); }}>{e} / {p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
      <label style={{ fontSize:'13px', fontWeight:'500', color:'#323130' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required style={INP}
        onFocus={e => e.target.style.borderColor='#0078d4'}
        onBlur={e  => e.target.style.borderColor='#e1dfdd'} />
    </div>
  );
}
function Btn({ loading, children }) {
  return (
    <button type="submit" disabled={loading} style={{ ...S.btn, ...(loading?{background:'#a0c4e8',cursor:'not-allowed'}:{}) }}>
      {loading ? <span style={S.spinner}/> : children}
    </button>
  );
}

const INP = { padding:'10px 14px', border:'1px solid #e1dfdd', borderRadius:'6px', fontSize:'14px', outline:'none', background:'white' };
const S = {
  page:  { display:'flex', minHeight:'100vh' },
  left:  { width:'45%', background:'linear-gradient(145deg,#0078d4,#003d6b)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 56px', color:'white' },
  brand: { marginBottom:'40px' },
  brandName: { fontSize:'38px', fontWeight:'700', letterSpacing:'-1px', marginBottom:'6px', marginTop:'12px' },
  tagline:   { fontSize:'15px', opacity:0.8 },
  feature:   { display:'flex', alignItems:'center', gap:'10px', fontSize:'14px', opacity:0.9, marginBottom:'12px' },
  check:     { width:'22px', height:'22px', background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', flexShrink:0, textAlign:'center', lineHeight:'22px' },
  right:     { flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#fafafa', padding:'40px 24px' },
  card:      { width:'100%', maxWidth:'400px', background:'white', borderRadius:'12px', padding:'40px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' },
  title:     { fontSize:'26px', fontWeight:'600', color:'#201f1e', marginBottom:'4px' },
  subtitle:  { color:'#605e5c', fontSize:'14px', marginBottom:'24px' },
  error:     { background:'#fde7e9', border:'1px solid #fca5a8', color:'#b91c1c', padding:'10px 14px', borderRadius:'6px', marginBottom:'18px', fontSize:'13px', display:'flex', gap:'8px', alignItems:'center' },
  form:      { display:'flex', flexDirection:'column', gap:'16px' },
  forgotLink:{ fontSize:'12px', color:'#0078d4', textDecoration:'none' },
  btn:       { padding:'11px', background:'#0078d4', color:'white', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', height:'42px' },
  spinner:   { width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  divider:   { textAlign:'center', marginTop:'20px', fontSize:'13px', color:'#605e5c' },
  link:      { color:'#0078d4', textDecoration:'none', fontWeight:'500' },
  hints:     { marginTop:'20px', padding:'12px 14px', background:'#f3f2f1', borderRadius:'6px', borderLeft:'3px solid #0078d4' },
  hintsTitle:{ fontSize:'12px', fontWeight:'600', color:'#605e5c', marginBottom:'6px' },
  hint:      { fontSize:'12px', color:'#0078d4', cursor:'pointer', fontFamily:'monospace', marginBottom:'3px' },
};
