import React, { useState } from 'react';
import { format } from 'date-fns';
import api from '../utils/api';
import DOMPurify from 'dompurify';
import ProfileCard from './ProfileCard';

const getInitials = (n='') => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const fmtSize = b => b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';
const fileIcon = (m='') =>
  m.startsWith('image/')?'🖼️':m==='application/pdf'?'📄':
  m.includes('word')?'📝':m.includes('sheet')||m.includes('excel')?'📊':
  m.includes('zip')?'🗜️':m.startsWith('text/')?'📃':'📎';

// Feature 7: Recall countdown helper
const getRecallTimeLeft = (email) => {
  if (!email?.isSent || email?.isDraft || email?.isRecalled) return null;
  const sentAt  = email.deliveredAt || email.createdAt;
  const elapsed = (Date.now() - new Date(sentAt).getTime()) / 1000 / 60;
  const left    = 2 - elapsed;
  return left > 0 ? Math.ceil(left * 60) : null; // seconds left
};

export default function EmailDetail({
  email, onDelete, onToggleRead, onToggleStar, onToggleImportant,
  onArchive, onEditDraft, onRemoveFromFolder,
  view, folders, activeFolderId,
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [movingTo,     setMovingTo]     = useState(null);
  const [dlErrors,     setDlErrors]     = useState({});
  const [imgPreview,   setImgPreview]   = useState(null);
  const [recalling,    setRecalling]    = useState(false);
  const [recalled,     setRecalled]     = useState(false);
  const [recallErr,    setRecallErr]    = useState('');

  if (!email) {
    return (
      <div style={S.empty}>
        <div style={{ fontSize:'52px', marginBottom:'14px', opacity:0.55 }}>✉️</div>
        <p style={{ fontSize:'15px', fontWeight:'500', color:'#605e5c', marginBottom:'5px' }}>Select a message</p>
        <p style={{ fontSize:'13px', color:'#a19f9d', textAlign:'center', maxWidth:'280px', lineHeight:1.5 }}>
          {view==='folder' ? 'Drag emails into sidebar folders to organise them' : `Choose from your ${view} on the left`}
        </p>
      </div>
    );
  }

  const isInbox  = view==='inbox';
  const isDraft  = email.isDraft;
  const isFolder = view==='folder';
  const isSent   = view==='sent';
  const dateStr  = format(new Date(email.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a");
  const schedLabel = email.scheduledTime && !email.isSent
    ? `⏰ Scheduled: ${format(new Date(email.scheduledTime),'MMM d, yyyy h:mm a')}` : null;

  const secsLeft = getRecallTimeLeft(email);

  // Move to folder
  const handleMoveToFolder = async folder => {
    setMovingTo(folder._id); setShowMoveMenu(false);
    try { await api.put(`/folders/${folder._id}/emails/${email._id}`); }
    catch { alert('Failed to move email to folder.'); }
    finally { setMovingTo(null); }
  };

  // Authenticated download
  const handleDownload = async (e, att) => {
    e.preventDefault(); setDlErrors(p=>({...p,[att._id]:false}));
    try {
      const res = await api.get(`/email/${email._id}/attachments/${att._id}`, { responseType:'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: att.mimetype||'application/octet-stream' }));
      const a = document.createElement('a');
      a.href=url; a.download=att.originalName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { setDlErrors(p=>({...p,[att._id]:true})); }
  };

  const handlePreview = async (e, att) => {
    e.preventDefault();
    try {
      const res = await api.get(`/email/${email._id}/attachments/${att._id}`, { responseType:'blob' });
      setImgPreview({ url: URL.createObjectURL(new Blob([res.data],{type:att.mimetype})), name: att.originalName });
    } catch { handleDownload(e, att); }
  };

  // Feature 7: Recall email
  const handleRecall = async () => {
    setRecalling(true); setRecallErr('');
    try {
      await api.patch(`/email/recall/${email._id}`);
      setRecalled(true);
    } catch (err) {
      setRecallErr(err.response?.data?.message || 'Recall failed');
    } finally { setRecalling(false); }
  };

  // Feature 6: Render HTML body safely
  const renderBody = () => {
    const html = email.htmlBody || email.body || '';
    if (!html) return <p style={{ color:'#a19f9d', fontStyle:'italic' }}>(No message body)</p>;
    if (email.htmlBody) {
      // Sanitize then render rich HTML
      return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.htmlBody) }}/>;
    }
    // Plain text fallback — render with line breaks + @mention highlights
    const mentions  = (email.mentions||[]).map(m=>m.name);
    return html.split('\n').map((line,i)=>{
      const parts = line.split(/(@\w[\w\s]*)/g);
      return (
        <p key={i} style={{marginBottom:'6px'}}>
          {parts.map((p,j)=>mentions.some(n=>p===`@${n}`)
            ? <span key={j} style={{background:'#deecf9',color:'#0078d4',fontWeight:'600',padding:'1px 4px',borderRadius:'3px'}}>{p}</span>
            : (p||null))}
          {line===''&&<br/>}
        </p>
      );
    });
  };

  return (
    <div style={S.container}>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={{ display:'flex', gap:'2px', flexWrap:'wrap' }}>
          {isDraft
            ? <TB onClick={onEditDraft}>✏️ Edit Draft</TB>
            : <>
                <TB onClick={onToggleStar}>{email.isStarred?'⭐':'☆'} {email.isStarred?'Unstar':'Star'}</TB>
                <TB onClick={()=>onToggleImportant?.(email._id)}
                  style={email.isImportant?{background:'#fde7e9',border:'1px solid #fca5a8',color:'#d13438'}:{}}>
                  {email.isImportant?'🔴':'○'} {email.isImportant?'Important':'Mark Important'}
                </TB>
                {isInbox&&<>
                  <TB onClick={onToggleRead}>{email.isRead?'📧':'✉️'} {email.isRead?'Mark unread':'Mark read'}</TB>
                  <TB onClick={()=>onArchive(email._id)}>📦 {email.isArchived?'Unarchive':'Archive'}</TB>
                </>}
                {/* Feature 7: Recall button — visible in Sent view within 2 min */}
                {isSent && !email.isRecalled && (recalled || secsLeft !== null) && (
                  <TB onClick={handleRecall} disabled={recalling||recalled}
                    style={{ color:'#ca5010', border:'1px solid #ca5010', background:recalled?'#fff4ce':'' }}>
                    {recalled ? '↩️ Recalled' : recalling ? '…' : `↩️ Recall (${secsLeft}s)`}
                  </TB>
                )}
                {email.isRecalled && <span style={S.recalledBadge}>↩️ Recalled</span>}
                {/* Move to folder */}
                {folders?.length>0&&(
                  <div style={{ position:'relative' }}>
                    <TB onClick={()=>setShowMoveMenu(s=>!s)}>📁 {movingTo?'Moving…':'Move to'}</TB>
                    {showMoveMenu&&(
                      <div style={S.folderMenu}>
                        <div style={S.folderMenuHdr}>Move to folder</div>
                        {folders.map(f=>(
                          <div key={f._id} style={{...S.folderMenuItem,...(f._id===activeFolderId?{background:'#f3f2f1'}:{})}}
                            onClick={()=>handleMoveToFolder(f)}>
                            <span style={{...S.folderDot,background:f.color}}/>{f.name}
                            {f._id===activeFolderId&&<span style={S.currentTag}>current</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {isFolder&&onRemoveFromFolder&&<TB onClick={()=>onRemoveFromFolder(email._id)}>📤 Remove</TB>}
              </>
          }
        </div>
        <TB onClick={()=>onDelete(email._id)} style={{color:'#d13438'}}>🗑️ Delete</TB>
      </div>

      {recallErr && <div style={{ padding:'8px 22px', background:'#fde7e9', color:'#d13438', fontSize:'13px' }}>⚠ {recallErr}</div>}

      {/* Body */}
      <div style={S.body} onClick={()=>setShowMoveMenu(false)}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
          <h1 style={{ fontSize:'21px', fontWeight:'600', color:'#201f1e', lineHeight:1.3, flex:1 }}>{email.subject}</h1>
          {email.isImportant  && <span style={S.impBadge}>🔴 Important</span>}
          {schedLabel         && <span style={S.schedBadge}>{schedLabel}</span>}
          {!email.isRead&&isInbox && <span style={S.unreadPill}>Unread</span>}
          {email.smtpSent     && <span style={S.smtpBadge}>📡 SMTP</span>}
          {email.isRecalled   && <span style={S.recalledPill}>↩️ Recalled</span>}
        </div>

        {/* Sender — with ProfileCard hover */}
        <div style={{ display:'flex', gap:'12px', alignItems:'flex-start', marginBottom:'14px' }}>
          <div style={S.avatarCircle}>
            {email.sender?.avatar
              ? <img src={email.sender.avatar} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }}/>
              : <span style={{ fontSize:'13px', fontWeight:'700', color:'white' }}>{getInitials(email.sender?.name)}</span>}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', flexWrap:'wrap' }}>
              {/* Feature 4: ProfileCard hover wrapper */}
              <ProfileCard userId={email.sender?._id}>
                <span style={{ fontSize:'14px', fontWeight:'600', color:'#201f1e', textDecoration:'underline dotted', textDecorationColor:'#a19f9d' }}>
                  {email.sender?.name||'Unknown'}
                </span>
              </ProfileCard>
              <span style={{ fontSize:'13px', color:'#605e5c' }}>&lt;{email.sender?.email}&gt;</span>
            </div>
            {email.receiver&&<div style={S.meta}>To: <strong>{email.receiver?.name}</strong> &lt;{email.receiver?.email}&gt;</div>}
            {!email.receiver&&email.toEmail&&<div style={S.meta}>To: {email.toEmail}</div>}
            {email.cc?.length>0 &&<div style={S.meta}>Cc: {email.cc.join(', ')}</div>}
            {email.bcc?.length>0&&<div style={S.meta}>Bcc: {email.bcc.join(', ')}</div>}
            {email.mentions?.length>0&&(
              <div style={S.meta}>Mentions: {email.mentions.map(m=>(
                <span key={m.email} style={S.mentionChip}>@{m.name}</span>
              ))}</div>
            )}
            <div style={{ fontSize:'11px', color:'#a19f9d', marginTop:'3px' }}>{dateStr}</div>
          </div>
        </div>

        <div style={{ height:'1px', background:'#e1dfdd', margin:'14px 0 20px' }}/>

        {email.meetingLink&&(
          <div style={S.meetCard}>
            <span style={{ fontSize:'22px' }}>📹</span>
            <div>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#201f1e', marginBottom:'4px' }}>Meeting Invitation</div>
              <a href={email.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize:'13px', color:'#0078d4', wordBreak:'break-all' }}>
                {email.meetingLink}
              </a>
            </div>
          </div>
        )}

        {/* Feature 6: HTML body rendered safely */}
        <div style={{ fontSize:'15px', lineHeight:1.7, color:'#201f1e' }}>
          {renderBody()}
        </div>

        {/* Attachments — Feature 8: Preview + authenticated download */}
        {email.attachments?.length>0&&(
          <div style={{ marginTop:'24px', paddingTop:'18px', borderTop:'1px solid #e1dfdd' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#323130', marginBottom:'12px' }}>
              📎 {email.attachments.length} Attachment{email.attachments.length>1?'s':''}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
              {email.attachments.map(att=>(
                <div key={att._id||att.filename} style={S.attCard}>
                  <div style={S.attIconWrap}>
                    <span style={{ fontSize:'28px' }}>{fileIcon(att.mimetype)}</span>
                  </div>
                  <div style={S.attInfo}>
                    <div style={S.attName} title={att.originalName}>{att.originalName}</div>
                    <div style={S.attSize}>{fmtSize(att.size)}</div>
                    {dlErrors[att._id]&&<div style={{ fontSize:'11px', color:'#d13438' }}>⚠️ Unavailable</div>}
                  </div>
                  <div style={S.attBtns}>
                    {att.mimetype?.startsWith('image/')&&(
                      <button style={S.attBtn} onClick={e=>handlePreview(e,att)} title="Preview">👁️</button>
                    )}
                    <button style={{...S.attBtn,...(dlErrors[att._id]?{opacity:0.4,cursor:'not-allowed'}:{})}}
                      onClick={e=>handleDownload(e,att)} title="Download">⬇️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {imgPreview&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000 }}
          onClick={()=>{ URL.revokeObjectURL(imgPreview.url); setImgPreview(null); }}>
          <div style={{ background:'white', borderRadius:'12px', overflow:'hidden', maxWidth:'92vw', maxHeight:'92vh', display:'flex', flexDirection:'column' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid #e1dfdd' }}>
              <span style={{ fontSize:'14px', fontWeight:'600' }}>{imgPreview.name}</span>
              <button onClick={()=>{ URL.revokeObjectURL(imgPreview.url); setImgPreview(null); }}
                style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:'20px', color:'#605e5c' }}>✕</button>
            </div>
            <img src={imgPreview.url} alt={imgPreview.name} style={{ maxWidth:'88vw', maxHeight:'82vh', objectFit:'contain', display:'block' }}/>
          </div>
        </div>
      )}
    </div>
  );
}

function TB({ onClick, children, style={}, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'6px 11px', background:'transparent', border:'1px solid transparent',
      borderRadius:'4px', cursor: disabled?'not-allowed':'pointer',
      display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', color:'#605e5c',
      opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}

const S = {
  container:  { flex:1, display:'flex', flexDirection:'column', background:'white', overflow:'hidden' },
  toolbar:    { padding:'9px 22px', borderBottom:'1px solid #e1dfdd', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fafafa', flexWrap:'wrap', gap:'4px' },
  body:       { flex:1, overflowY:'auto', padding:'24px 34px' },
  avatarCircle:{ width:'40px', height:'40px', borderRadius:'50%', background:'#0078d4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', flexShrink:0, overflow:'hidden' },
  meta:       { fontSize:'12px', color:'#605e5c', marginTop:'3px', display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap' },
  impBadge:   { background:'#fde7e9', color:'#d13438', fontSize:'12px', fontWeight:'700', padding:'4px 10px', borderRadius:'12px', border:'1px solid #fca5a8', flexShrink:0 },
  schedBadge: { background:'#fff4ce', color:'#7a5f00', fontSize:'12px', fontWeight:'500', padding:'3px 10px', borderRadius:'12px', border:'1px solid #ffd966', flexShrink:0 },
  unreadPill: { background:'#deecf9', color:'#0078d4', fontSize:'11px', fontWeight:'600', padding:'3px 10px', borderRadius:'12px', flexShrink:0 },
  smtpBadge:  { background:'#dff6dd', color:'#107c10', fontSize:'11px', fontWeight:'600', padding:'3px 10px', borderRadius:'12px', border:'1px solid #9fd09f', flexShrink:0 },
  recalledBadge:{ background:'#fff4ce', color:'#ca5010', fontSize:'11px', fontWeight:'700', padding:'3px 10px', borderRadius:'12px', border:'1px solid #f7d793', flexShrink:0 },
  recalledPill: { background:'#fff4ce', color:'#ca5010', fontSize:'11px', fontWeight:'600', padding:'3px 10px', borderRadius:'12px', flexShrink:0 },
  meetCard:   { display:'flex', gap:'12px', alignItems:'flex-start', padding:'14px 16px', background:'#deecf9', borderRadius:'8px', marginBottom:'16px', border:'1px solid #b3d4f0' },
  mentionChip:{ display:'inline-flex', alignItems:'center', padding:'1px 7px', background:'#f4f0ff', borderRadius:'10px', fontSize:'11px', fontWeight:'600', color:'#8764b8', marginRight:'4px' },
  attCard:    { display:'flex', flexDirection:'column', alignItems:'center', width:'140px', padding:'14px 10px', background:'#f9f9f9', borderRadius:'10px', border:'1px solid #e1dfdd', textAlign:'center' },
  attIconWrap:{ marginBottom:'8px' },
  attInfo:    { width:'100%' },
  attName:    { fontSize:'12px', fontWeight:'500', color:'#201f1e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'2px' },
  attSize:    { fontSize:'11px', color:'#a19f9d', marginBottom:'8px' },
  attBtns:    { display:'flex', gap:'6px' },
  attBtn:     { background:'white', border:'1px solid #e1dfdd', borderRadius:'6px', padding:'5px 9px', cursor:'pointer', fontSize:'13px' },
  folderMenu: { position:'absolute', top:'100%', left:0, background:'white', border:'1px solid #e1dfdd', borderRadius:'8px', boxShadow:'0 6px 24px rgba(0,0,0,0.14)', zIndex:300, minWidth:'200px', overflow:'hidden' },
  folderMenuHdr: { padding:'8px 14px', fontSize:'11px', fontWeight:'700', color:'#a19f9d', borderBottom:'1px solid #e1dfdd', background:'#fafafa' },
  folderMenuItem:{ display:'flex', alignItems:'center', gap:'9px', padding:'10px 14px', cursor:'pointer', fontSize:'13px', color:'#201f1e' },
  folderDot:  { width:'9px', height:'9px', borderRadius:'50%', flexShrink:0 },
  currentTag: { marginLeft:'auto', fontSize:'10px', color:'#a19f9d', fontStyle:'italic' },
  empty:      { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#a19f9d', background:'#fafafa', padding:'40px' },
};
