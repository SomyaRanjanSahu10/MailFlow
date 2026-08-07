import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';

// Feature 4: Hover profile card — wraps any element
// Usage: <ProfileCard userId={email.sender._id}><span>{email.sender.name}</span></ProfileCard>
export default function ProfileCard({ userId, children }) {
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pos,     setPos]     = useState({ top: 0, left: 0 });
  const wrapRef  = useRef();
  const timerRef = useRef();

  const fetchProfile = async () => {
    if (profile || loading || !userId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/profile/${userId}`);
      setProfile(data.user);
    } catch { setProfile(null); }
    finally { setLoading(false); }
  };

  const handleMouseEnter = (e) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        setPos({
          top:  rect.bottom + window.scrollY + 6,
          left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
        });
      }
      fetchProfile();
      setVisible(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 200);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  return (
    <>
      <span ref={wrapRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
        style={{ cursor:'pointer', display:'inline-block' }}>
        {children}
      </span>

      {visible && (
        <div
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={handleMouseLeave}
          style={{ ...S.card, top: pos.top, left: pos.left }}>
          {loading ? (
            <div style={S.loading}>Loading…</div>
          ) : profile ? (
            <>
              <div style={S.cardTop}>
                {profile.avatar
                  ? <img src={profile.avatar} alt="" style={S.avatar}/>
                  : <div style={S.avatarFallback}>{initials}</div>}
                <div>
                  <div style={S.name}>{profile.name}</div>
                  <div style={S.email}>{profile.email}</div>
                </div>
              </div>
              {(profile.designation || profile.department || profile.phone) && (
                <div style={S.details}>
                  {profile.designation && <Row icon="💼" text={profile.designation}/>}
                  {profile.department  && <Row icon="🏢" text={profile.department}/>}
                  {profile.phone       && <Row icon="📞" text={profile.phone}/>}
                </div>
              )}
            </>
          ) : (
            <div style={S.loading}>User not found</div>
          )}
        </div>
      )}
    </>
  );
}

function Row({ icon, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:'#605e5c', padding:'3px 0' }}>
      <span>{icon}</span><span>{text}</span>
    </div>
  );
}

const S = {
  card:         { position:'fixed', zIndex:9998, width:'260px', background:'white', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)', border:'1px solid #e1dfdd', overflow:'hidden', animation:'fadeIn 0.15s ease' },
  loading:      { padding:'16px', fontSize:'13px', color:'#a19f9d', textAlign:'center' },
  cardTop:      { display:'flex', gap:'12px', alignItems:'center', padding:'16px', background:'linear-gradient(135deg,#0078d4,#005a9e)', color:'white' },
  avatar:       { width:'44px', height:'44px', borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(255,255,255,0.6)', flexShrink:0 },
  avatarFallback:{ width:'44px', height:'44px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', flexShrink:0 },
  name:         { fontSize:'14px', fontWeight:'700', marginBottom:'2px' },
  email:        { fontSize:'11px', opacity:0.8 },
  details:      { padding:'12px 16px', display:'flex', flexDirection:'column', gap:'4px' },
};
