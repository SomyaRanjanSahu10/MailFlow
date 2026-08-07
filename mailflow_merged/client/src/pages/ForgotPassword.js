import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const STEPS = { EMAIL: 'email', OTP: 'otp', RESET: 'reset', DONE: 'done' };

export default function ForgotPassword() {
  const [step,       setStep]       = useState(STEPS.EMAIL);
  const [email,      setEmail]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [msg,        setMsg]        = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const navigate = useNavigate();

  const go = async (fn) => {
    setError(''); setMsg(''); setLoading(true);
    try { await fn(); } catch (err) { setError(err.response?.data?.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  // Step 1: Request OTP
  const handleRequestOTP = () => go(async () => {
    const { data } = await api.post('/auth/forgot-password', { email });
    setMsg(data.message);
    // Dev mode: backend returns OTP when SMTP not configured
    if (data._devOTP) setOtp(data._devOTP);
    setStep(STEPS.OTP);
  });

  // Step 2: Verify OTP
  const handleVerifyOTP = () => go(async () => {
    const { data } = await api.post('/auth/verify-otp', { email, otp });
    setResetToken(data.resetToken);
    setStep(STEPS.RESET);
  });

  // Step 3: Set new password
  const handleReset = () => go(async () => {
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 6)   { setError('Password must be at least 6 characters'); return; }
    await api.post('/auth/reset-password', { resetToken, newPassword: newPw });
    setStep(STEPS.DONE);
  });

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Progress indicator */}
        <div style={S.progress}>
          {['Email','OTP','Password','Done'].map((label, i) => {
            const stepKeys = [STEPS.EMAIL, STEPS.OTP, STEPS.RESET, STEPS.DONE];
            const currentIdx = stepKeys.indexOf(step);
            const active  = i === currentIdx;
            const done    = i < currentIdx;
            return (
              <React.Fragment key={label}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <div style={{ ...S.dot, ...(done?S.dotDone:active?S.dotActive:S.dotIdle) }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize:'11px', color: active?'#0078d4':'#a19f9d', fontWeight: active?'600':'400' }}>{label}</span>
                </div>
                {i < 3 && <div style={{ ...S.line, ...(done?{background:'#0078d4'}:{}) }} />}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>
            {step===STEPS.EMAIL?'📧':step===STEPS.OTP?'🔢':step===STEPS.RESET?'🔒':'🎉'}
          </div>
          <h2 style={S.title}>
            {step===STEPS.EMAIL?'Forgot Password':step===STEPS.OTP?'Enter OTP':step===STEPS.RESET?'New Password':'Password Reset!'}
          </h2>
          <p style={S.sub}>
            {step===STEPS.EMAIL ? 'Enter your email to receive a 6-digit OTP' :
             step===STEPS.OTP   ? `Check your email (${email}) for the OTP` :
             step===STEPS.RESET ? 'Create your new password' :
             'Your password has been updated successfully.'}
          </p>
        </div>

        {error && <div style={S.error}>⚠ {error}</div>}
        {msg   && <div style={S.success}>✅ {msg}</div>}

        {step === STEPS.EMAIL && (
          <div style={S.form}>
            <Input label="Email address" type="email" value={email} onChange={setEmail} placeholder="Enter your email" />
            <Btn loading={loading} onClick={handleRequestOTP}>Send OTP</Btn>
          </div>
        )}

        {step === STEPS.OTP && (
          <div style={S.form}>
            <Input label="6-Digit OTP" type="text" value={otp} onChange={setOtp} placeholder="123456" maxLength={6}
              style={{ textAlign:'center', fontSize:'24px', letterSpacing:'10px', fontWeight:'700' }} />
            <Btn loading={loading} onClick={handleVerifyOTP}>Verify OTP</Btn>
            <button style={S.resend} onClick={() => { setStep(STEPS.EMAIL); setMsg(''); setOtp(''); }}>
              ← Change email or resend
            </button>
          </div>
        )}

        {step === STEPS.RESET && (
          <div style={S.form}>
            <Input label="New Password" type="password" value={newPw} onChange={setNewPw} placeholder="Min. 6 characters" />
            <Input label="Confirm Password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="Repeat password" />
            <Btn loading={loading} onClick={handleReset}>Reset Password</Btn>
          </div>
        )}

        {step === STEPS.DONE && (
          <button style={{ ...S.btn, width:'100%' }} onClick={() => navigate('/login')}>
            Go to Login →
          </button>
        )}

        <div style={{ textAlign:'center', marginTop:'20px' }}>
          <Link to="/login" style={{ color:'#0078d4', textDecoration:'none', fontSize:'13px' }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}

function Input({ label, type, value, onChange, placeholder, maxLength, style: extra = {} }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
      {label && <label style={{ fontSize:'13px', fontWeight:'500', color:'#323130' }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength} required
        style={{ ...INP, ...extra }}
        onFocus={e => e.target.style.borderColor='#0078d4'}
        onBlur={e  => e.target.style.borderColor='#e1dfdd'} />
    </div>
  );
}
function Btn({ loading, onClick, children }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ ...S.btn, width:'100%', ...(loading?{background:'#a0c4e8',cursor:'not-allowed'}:{}) }}>
      {loading ? <span style={S.spinner}/> : children}
    </button>
  );
}

const INP = { padding:'11px 14px', border:'1px solid #e1dfdd', borderRadius:'7px', fontSize:'14px', outline:'none', background:'white', width:'100%', boxSizing:'border-box' };
const S = {
  page:    { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0078d4,#003d6b)', padding:'20px' },
  card:    { background:'white', borderRadius:'16px', padding:'40px', maxWidth:'440px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' },
  progress:{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'32px' },
  dot:     { width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700' },
  dotIdle: { background:'#f3f2f1', color:'#a19f9d' },
  dotActive:{ background:'#0078d4', color:'white' },
  dotDone: { background:'#107c10', color:'white' },
  line:    { flex:1, height:'2px', background:'#e1dfdd', margin:'0 6px', marginBottom:'18px' },
  title:   { fontSize:'22px', fontWeight:'700', color:'#201f1e', marginBottom:'6px' },
  sub:     { fontSize:'14px', color:'#605e5c', lineHeight:1.5 },
  error:   { background:'#fde7e9', color:'#b91c1c', padding:'10px 14px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px' },
  success: { background:'#dff6dd', color:'#107c10', padding:'10px 14px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px' },
  form:    { display:'flex', flexDirection:'column', gap:'16px' },
  btn:     { padding:'12px', background:'#0078d4', color:'white', border:'none', borderRadius:'7px', fontSize:'14px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', height:'44px' },
  spinner: { width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  resend:  { background:'transparent', border:'none', color:'#0078d4', cursor:'pointer', fontSize:'13px', textAlign:'center' },
};
