import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Required for toolbar icons + styling

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};
const QUILL_FORMATS = [
  'header', 'font', 'size', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align', 'list', 'bullet', 'link',
];

export default function ComposeModal({ onClose, onSent, onDrafted, draft }) {
  const [form, setForm] = useState({
    to:  draft?.toEmail || '',
    cc:  (draft?.cc  || []).join(', '),
    bcc: (draft?.bcc || []).join(', '),
    subject: draft?.subject || '',
  });
  const [htmlBody,     setHtmlBody]     = useState(draft?.htmlBody || draft?.body || '');
  const [isImportant,  setIsImportant]  = useState(draft?.isImportant || false);
  const [showCc,       setShowCc]       = useState(!!(draft?.cc?.length));
  const [showBcc,      setShowBcc]      = useState(!!(draft?.bcc?.length));
  const [files,        setFiles]        = useState([]);
  const [existingAtts, setExistingAtts] = useState(draft?.attachments || []);
  const [sending,      setSending]      = useState(false);
  const [savingDraft,  setSavingDraft]  = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [suggestions,  setSuggestions]  = useState([]);
  const [showSugg,     setShowSugg]     = useState(false);
  const [activeSuggF,  setActiveSuggF]  = useState('to');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledTime,setScheduledTime]= useState('');
  const [sigLoaded,    setSigLoaded]    = useState(false);
  const signatureAdded = useRef(false);
  const debRef  = useRef();
  const fileRef = useRef();
  const draftId = draft?._id;
  const fmtSize = b => b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';
  const minSched = new Date(Date.now() + 60000).toISOString().slice(0,16);

  // Feature 2: Auto-append signature when composing (not when editing draft)
  useEffect(() => {
    // Signature auto-insertion disabled.
  }, []);

  // Autocomplete
  const handleRecipChange = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    setActiveSuggF(field);
    clearTimeout(debRef.current);
    const last = val.split(',').pop().trim();
    if (last.length >= 2) {
      debRef.current = setTimeout(async () => {
        try { const { data } = await api.get(`/users/search?q=${encodeURIComponent(last)}`); setSuggestions(data.users); setShowSugg(data.users.length > 0); }
        catch {}
      }, 250);
    } else { setSuggestions([]); setShowSugg(false); }
  };

  const pickSugg = user => {
    setForm(f => {
      const parts = f[activeSuggF].split(',');
      parts[parts.length - 1] = ' ' + user.email;
      return { ...f, [activeSuggF]: parts.join(',').replace(/^\s*,/, '').trim() };
    });
    setShowSugg(false);
  };

  const buildFD = () => {
    const fd = new FormData();
    const sanitized = DOMPurify.sanitize(htmlBody);
    fd.append('to', form.to.trim()); fd.append('subject', form.subject.trim());
    fd.append('htmlBody', sanitized);
    // Plain text fallback (strip HTML)
    fd.append('body', sanitized.replace(/<[^>]*>/g, ' ').replace(/\s+/g,' ').trim());
    fd.append('cc', form.cc.trim()); fd.append('bcc', form.bcc.trim());
    fd.append('isImportant', isImportant.toString());
    if (draftId) fd.append('draftId', draftId);
    files.forEach(f => fd.append('attachments', f));
    return fd;
  };

  const handleSend = async e => {
    e.preventDefault(); setError('');
    if (!form.to || !form.subject) return setError('Recipient and subject are required.');
    setSending(true);
    try {
      if (showSchedule) {
        if (!scheduledTime) { setSending(false); return setError('Please pick a schedule time.'); }
        const d = new Date(scheduledTime);
        if (isNaN(d) || d <= new Date()) { setSending(false); return setError('Please select a future time.'); }
        const fd = buildFD(); fd.append('scheduledTime', d.toISOString());
        await api.post('/email/schedule', fd); setSuccess('⏰ Email scheduled!');
      } else if (draftId) {
        await api.post(`/email/draft/${draftId}/send`, buildFD()); setSuccess('✅ Draft sent!');
      } else {
        await api.post('/email/send', buildFD()); setSuccess('✅ Email sent!');
      }
      setTimeout(() => { onSent?.(); onClose(); }, 900);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send.'); }
    finally { setSending(false); }
  };

  const handleSaveDraft = async () => {
    if (!form.subject) return setError('Subject required to save draft.');
    setError(''); setSavingDraft(true);
    try { await api.post('/email/draft', buildFD()); setSuccess('📝 Draft saved!'); setTimeout(() => { onDrafted?.(); onClose(); }, 900); }
    catch (err) { setError(err.response?.data?.message || 'Failed to save draft.'); }
    finally { setSavingDraft(false); }
  };

  const handleFileChange = e => {
    const valid = Array.from(e.target.files||[]).filter(f => {
      if (f.size > MAX_FILE_SIZE) { setError(`${f.name} exceeds 10 MB`); return false; } return true;
    });
    setFiles(p => [...p, ...valid]); e.target.value = '';
  };

  const insertMeeting = () => {
    const link = `https://meet.mailflow.app/${Math.random().toString(36).slice(2,10).toUpperCase()}`;
    setHtmlBody(p => p + `<p><a href="${link}">📅 Join Meeting: ${link}</a></p>`);
  };

  const SuggList = () => showSugg ? (
    <div style={S.suggBox}>
      {suggestions.map(u => (
        <div key={u._id} style={S.suggItem} onMouseDown={() => pickSugg(u)}>
          {u.avatar
            ? <img src={u.avatar} alt="" style={S.suggAvImg}/>
            : <div style={S.suggAv}>{u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>}
          <div>
            <div style={S.suggName}>{u.name}</div>
            <div style={S.suggEmail}>{u.email}</div>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <h3 style={S.title}>{draftId ? '✏️ Edit Draft' : '📨 New message'}</h3>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            <button onClick={handleSaveDraft} disabled={savingDraft} style={S.draftBtn}>{savingDraft?'…':'💾 Draft'}</button>
            <button onClick={onClose} style={S.closeBtn}>✕</button>
          </div>
        </div>
        {error   && <div style={S.errBar}>⚠ {error}</div>}
        {success && <div style={S.okBar}>{success}</div>}

        <form onSubmit={handleSend} style={S.form}>
          {/* To */}
          <div style={S.row}>
            <label style={S.lbl}>To</label>
            <div style={{ flex:1, position:'relative' }}>
              <input type="text" value={form.to} onChange={e=>handleRecipChange('to',e.target.value)}
                onFocus={()=>setActiveSuggF('to')} onBlur={()=>setTimeout(()=>setShowSugg(false),150)}
                placeholder="Recipient email" style={S.inp} autoComplete="off"/>
              {activeSuggF==='to' && <SuggList/>}
            </div>
            <div style={{ display:'flex', gap:'4px' }}>
              {!showCc  && <button type="button" onClick={()=>setShowCc(true)}  style={S.ccBtn}>Cc</button>}
              {!showBcc && <button type="button" onClick={()=>setShowBcc(true)} style={S.ccBtn}>Bcc</button>}
            </div>
          </div>

          {showCc && (<><div style={S.divider}/>
            <div style={S.row}>
              <label style={S.lbl}>Cc</label>
              <div style={{ flex:1,position:'relative' }}>
                <input type="text" value={form.cc} onChange={e=>handleRecipChange('cc',e.target.value)}
                  onFocus={()=>setActiveSuggF('cc')} onBlur={()=>setTimeout(()=>setShowSugg(false),150)}
                  placeholder="Comma-separated" style={S.inp} autoComplete="off"/>
                {activeSuggF==='cc' && <SuggList/>}
              </div>
              <button type="button" onClick={()=>{setShowCc(false);setForm(f=>({...f,cc:''}))}} style={S.xBtn}>✕</button>
            </div></>)}

          {showBcc && (<><div style={S.divider}/>
            <div style={S.row}>
              <label style={S.lbl}>Bcc</label>
              <div style={{ flex:1,position:'relative' }}>
                <input type="text" value={form.bcc} onChange={e=>handleRecipChange('bcc',e.target.value)}
                  onFocus={()=>setActiveSuggF('bcc')} onBlur={()=>setTimeout(()=>setShowSugg(false),150)}
                  placeholder="Comma-separated" style={S.inp} autoComplete="off"/>
                {activeSuggF==='bcc' && <SuggList/>}
              </div>
              <button type="button" onClick={()=>{setShowBcc(false);setForm(f=>({...f,bcc:''}))}} style={S.xBtn}>✕</button>
            </div></>)}

          <div style={S.divider}/>
          <div style={S.row}>
            <label style={S.lbl}>Subject</label>
            <input type="text" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Email subject" style={S.inp}/>
            <button type="button" onClick={()=>setIsImportant(v=>!v)}
              style={{ ...S.impBtn, ...(isImportant?S.impBtnOn:{}) }}>
              {isImportant?'🔴':'○'} <span style={{fontSize:'11px',fontWeight:'600'}}>Important</span>
            </button>
          </div>
          <div style={S.divider}/>

          {/* Feature 6: Rich Text Editor */}
          <div style={S.editorWrap}>
            <ReactQuill
              value={htmlBody}
              onChange={setHtmlBody}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Compose your message…"
              theme="snow"
            />
          </div>

          {showSchedule && (
            <div style={S.schedRow}>
              <span style={{fontSize:'13px',color:'#605e5c'}}>📅 Schedule:</span>
              <input type="datetime-local" value={scheduledTime} min={minSched}
                onChange={e=>setScheduledTime(e.target.value)} style={S.dateInp}/>
              <button type="button" onClick={()=>{setShowSchedule(false);setScheduledTime('');}} style={S.ccBtn}>Cancel</button>
            </div>
          )}

          {existingAtts.length > 0 && (
            <div style={S.attList}>
              {existingAtts.map((a,i) => (
                <div key={i} style={S.attChip}>📎 <span>{a.originalName}</span><span style={S.attSz}>{fmtSize(a.size)}</span></div>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div style={S.attList}>
              {files.map((f,i) => (
                <div key={i} style={S.attChip}>
                  📎 <span style={{flex:1}}>{f.name}</span>
                  <span style={S.attSz}>{fmtSize(f.size)}</span>
                  <button type="button" onClick={()=>setFiles(p=>p.filter((_,j)=>j!==i))} style={S.xBtn}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={S.footer}>
            <button type="submit" disabled={sending||!!success}
              style={{...S.sendBtn,...((sending||success)?S.sendOff:{})}}>
              {sending?<><span style={S.spin}/> Sending…</>:showSchedule&&scheduledTime?'⏰ Schedule':'📨 Send'}
            </button>
            <div style={{ display:'flex', gap:'4px', flex:1 }}>
              <button type="button" onClick={()=>fileRef.current.click()} style={S.toolBtn} title="Attach file">📎</button>
              <input ref={fileRef} type="file" multiple style={{display:'none'}} onChange={handleFileChange}/>
              <button type="button" onClick={insertMeeting} style={S.toolBtn} title="Meeting link">📹</button>
              <button type="button" onClick={()=>setShowSchedule(s=>!s)} style={{...S.toolBtn,...(showSchedule?S.toolOn:{})}} title="Schedule">🕐</button>
            </div>
            {isImportant && <span style={S.impBadge}>🔴 Important</span>}
            <button type="button" onClick={onClose} style={S.cancelBtn}>Discard</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  overlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 },
  modal:  { width:'700px',maxWidth:'97vw',background:'white',borderRadius:'12px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',display:'flex',flexDirection:'column',maxHeight:'92vh',overflow:'hidden' },
  header: { padding:'14px 18px',background:'linear-gradient(135deg,#0078d4,#005a9e)',display:'flex',justifyContent:'space-between',alignItems:'center' },
  title:  { color:'white',fontSize:'15px',fontWeight:'600' },
  draftBtn:{ padding:'5px 12px',background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'5px',fontSize:'12px',fontWeight:'600',cursor:'pointer' },
  closeBtn:{ background:'transparent',border:'none',color:'rgba(255,255,255,0.9)',fontSize:'18px',cursor:'pointer',padding:'2px 6px' },
  errBar: { background:'#fde7e9',color:'#b91c1c',padding:'9px 18px',fontSize:'13px',borderBottom:'1px solid #fca5a8' },
  okBar:  { background:'#dff6dd',color:'#107c10',padding:'9px 18px',fontSize:'13px' },
  form:   { display:'flex',flexDirection:'column',flex:1,overflow:'hidden' },
  row:    { display:'flex',alignItems:'center',padding:'9px 18px',gap:'10px',position:'relative' },
  lbl:    { fontSize:'13px',fontWeight:'600',color:'#605e5c',width:'52px',flexShrink:0 },
  inp:    { flex:1,border:'none',outline:'none',fontSize:'14px',color:'#201f1e',background:'transparent',padding:'2px 0' },
  divider:{ height:'1px',background:'#e1dfdd',margin:'0 18px' },
  ccBtn:  { padding:'2px 8px',background:'transparent',border:'1px solid #d0d0d0',borderRadius:'4px',fontSize:'12px',fontWeight:'600',color:'#605e5c',cursor:'pointer' },
  xBtn:   { background:'transparent',border:'none',cursor:'pointer',color:'#a19f9d',fontSize:'13px',padding:'0 2px',flexShrink:0 },
  impBtn: { display:'flex',alignItems:'center',gap:'4px',padding:'4px 10px',border:'1px solid #d0d0d0',borderRadius:'14px',background:'transparent',cursor:'pointer',fontSize:'13px',color:'#605e5c',flexShrink:0 },
  impBtnOn:{ border:'1px solid #d13438',background:'#fde7e9',color:'#d13438' },
  impBadge:{ fontSize:'11px',color:'#d13438',fontWeight:'700',padding:'3px 8px',background:'#fde7e9',borderRadius:'10px',border:'1px solid #fca5a8' },
  editorWrap:{ minHeight:'220px', borderBottom:'1px solid #e1dfdd', overflow:'auto' },
  schedRow:{ display:'flex',alignItems:'center',gap:'10px',padding:'10px 18px',background:'#f9f7e8',borderTop:'1px solid #e8e4c0' },
  dateInp:{ padding:'6px 10px',border:'1px solid #d0d0d0',borderRadius:'5px',fontSize:'13px',outline:'none' },
  attList:{ padding:'8px 18px',display:'flex',flexWrap:'wrap',gap:'6px',borderTop:'1px solid #e1dfdd' },
  attChip:{ display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',background:'#f3f2f1',borderRadius:'14px',fontSize:'12px',color:'#323130',border:'1px solid #e1dfdd' },
  attSz:  { color:'#a19f9d',fontSize:'11px' },
  footer: { padding:'10px 18px',borderTop:'1px solid #e1dfdd',display:'flex',gap:'8px',alignItems:'center',background:'#fafafa' },
  sendBtn:{ padding:'9px 20px',background:'#0078d4',color:'white',border:'none',borderRadius:'6px',fontSize:'14px',fontWeight:'600',cursor:'pointer',display:'flex',alignItems:'center',gap:'7px' },
  sendOff:{ background:'#a0c4e8',cursor:'not-allowed' },
  toolBtn:{ padding:'7px 9px',background:'transparent',border:'1px solid transparent',borderRadius:'5px',fontSize:'16px',cursor:'pointer' },
  toolOn: { background:'#deecf9',border:'1px solid #b3d4f0' },
  cancelBtn:{ padding:'9px 14px',background:'transparent',color:'#605e5c',border:'1px solid #e1dfdd',borderRadius:'6px',fontSize:'14px',cursor:'pointer' },
  spin:   { width:'13px',height:'13px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite' },
  suggBox:{ position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1px solid #e1dfdd',borderRadius:'6px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden' },
  suggItem:{ padding:'9px 12px',cursor:'pointer',display:'flex',gap:'9px',alignItems:'center' },
  suggAv: { width:'30px',height:'30px',borderRadius:'50%',background:'#0078d4',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'700',flexShrink:0 },
  suggAvImg:{ width:'30px',height:'30px',borderRadius:'50%',objectFit:'cover',flexShrink:0 },
  suggName:{ fontSize:'13px',fontWeight:'500',color:'#201f1e' },
  suggEmail:{ fontSize:'11px',color:'#605e5c' },
};
