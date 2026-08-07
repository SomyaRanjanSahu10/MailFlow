import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '10px 14px',
    border: '1px solid #e1dfdd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    background: 'white',
    width: '100%',
  };

  return (
    <div style={styles.page}>
      <div style={styles.leftPanel}>
        <div style={styles.brandArea}>
          <div style={styles.logoBox}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="8" fill="white" fillOpacity="0.15"/>
              <path d="M8 10h8v8H8zM20 10h8v8h-8zM8 22h8v8H8zM20 22h8v8h-8z" fill="white"/>
            </svg>
          </div>
          <h1 style={styles.brandName}>MailFlow</h1>
          <p style={styles.brandTagline}>Your modern email experience</p>
        </div>
        <p style={styles.sideNote}>
          Join thousands of users managing their email with MailFlow. Fast, secure, and intuitive.
        </p>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Create account</h2>
            <p style={styles.formSubtitle}>Get started with MailFlow today</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            {[
              { name: 'name', label: 'Full name', type: 'text', placeholder: 'Your full name' },
              { name: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 characters' },
              { name: 'confirm', label: 'Confirm password', type: 'password', placeholder: 'Repeat your password' },
            ].map((field) => (
              <div key={field.name} style={styles.field}>
                <label style={styles.label}>{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#0078d4')}
                  onBlur={(e) => (e.target.style.borderColor = '#e1dfdd')}
                />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              ...styles.submitBtn,
              ...(loading ? styles.submitBtnDisabled : {}),
            }}>
              {loading ? <span style={styles.spinner} /> : 'Create account'}
            </button>
          </form>

          <div style={styles.loginRow}>
            Already have an account?{' '}
            <Link to="/login" style={styles.loginLink}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh' },
  leftPanel: {
    width: '42%',
    background: 'linear-gradient(145deg, #0078d4 0%, #005a9e 60%, #003d6b 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 56px',
    color: 'white',
  },
  brandArea: { marginBottom: '32px' },
  logoBox: { marginBottom: '16px' },
  brandName: { fontSize: '40px', fontWeight: '700', letterSpacing: '-1px', marginBottom: '8px' },
  brandTagline: { fontSize: '16px', opacity: 0.8, fontWeight: '300' },
  sideNote: { fontSize: '15px', opacity: 0.75, lineHeight: 1.7, fontWeight: '300' },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fafafa',
    padding: '40px 24px',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    animation: 'slideUp 0.3s ease',
  },
  formHeader: { marginBottom: '24px' },
  formTitle: { fontSize: '26px', fontWeight: '600', color: '#201f1e', marginBottom: '4px' },
  formSubtitle: { color: '#605e5c', fontSize: '14px' },
  errorBox: {
    background: '#fde7e9',
    border: '1px solid #fca5a8',
    color: '#b91c1c',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '13px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '500', color: '#323130' },
  submitBtn: {
    padding: '11px',
    background: '#0078d4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '42px',
  },
  submitBtnDisabled: { background: '#a0c4e8', cursor: 'not-allowed' },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  loginRow: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#605e5c',
  },
  loginLink: { color: '#0078d4', textDecoration: 'none', fontWeight: '500' },
};
