import React from 'react';
import { format, isToday } from 'date-fns';
import Pagination from './Pagination';

const fmtDate = d => {
  const dt = new Date(d);
  return isToday(dt) ? format(dt,'h:mm a') : format(dt,'MMM d');
};
const initials  = (n='') => n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const COLORS = ['#0078d4','#107c10','#d13438','#8764b8','#00b7c3','#ca5010','#038387','#881798'];
const avatarColor = (n='') => { let h=0; for(let i=0;i<n.length;i++) h=n.charCodeAt(i)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; };

const VIEW_META = {
  inbox:     { title:'Inbox',          emptyIcon:'📭', emptyMsg:'Your inbox is empty',       emptyHint:'New messages will appear here' },
  sent:      { title:'Sent',           emptyIcon:'📤', emptyMsg:'No sent messages',           emptyHint:'Emails you send will appear here' },
  drafts:    { title:'Drafts',         emptyIcon:'📝', emptyMsg:'No drafts saved',            emptyHint:'Save a draft to continue later' },
  archive:   { title:'Archive',        emptyIcon:'📦', emptyMsg:'Archive is empty',           emptyHint:'Archived emails appear here' },
  starred:   { title:'Starred',        emptyIcon:'⭐', emptyMsg:'No starred emails',          emptyHint:'Star emails to find them quickly' },
  important: { title:'Important',      emptyIcon:'🔴', emptyMsg:'No important emails',        emptyHint:'Mark emails important in the toolbar' },
  scheduled: { title:'Scheduled',      emptyIcon:'🕐', emptyMsg:'No scheduled emails',        emptyHint:'Scheduled emails appear here' },
  search:    { title:'Search Results', emptyIcon:'🔍', emptyMsg:'No results found',           emptyHint:'Try different keywords' },
  folder:    { title:'Folder',         emptyIcon:'📁', emptyMsg:'This folder is empty',       emptyHint:'Drag emails here from the sidebar' },
};

const STATUS_OPTIONS = [
  { value:'', label:'All mail' },
  { value:'unread', label:'Unread' },
  { value:'read',   label:'Read' },
];

export default function EmailList({
  emails, selectedId, onSelect, view, loading,
  searchQuery, onSearchChange, folderName,
  // Feature 3
  filters={}, showFilters, onToggleFilters, onFilterChange, onClearFilters, hasFilters,
  page, pages, total, limit, onPage,
}) {
  const isFolder   = view === 'folder';
  const meta       = VIEW_META[view] || VIEW_META.inbox;
  const title      = isFolder ? (folderName || 'Folder') : meta.title;
  const canFilter  = ['inbox','sent','important','starred','archive'].includes(view);

  const handleDragStart = (e, emailId) => {
    e.dataTransfer.setData('emailId', emailId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <h2 style={S.title}>{title}</h2>
        {total > 0 && <span style={S.count}>{total}</span>}
        {/* Feature 3: Filter toggle button */}
        {canFilter && (
          <button onClick={onToggleFilters}
            style={{ ...S.filterToggleBtn, ...(showFilters||hasFilters ? S.filterToggleBtnActive : {}) }}
            title="Filter emails">
            ⚙️ {hasFilters ? '●' : ''}
          </button>
        )}
      </div>

      {/* Feature 3: Filter panel */}
      {showFilters && canFilter && (
        <div style={S.filterPanel}>
          <div style={S.filterRow}>
            <div style={S.filterField}>
              <label style={S.filterLabel}>Status</label>
              <select value={filters.status||''} onChange={e=>onFilterChange('status',e.target.value)} style={S.filterSelect}>
                {STATUS_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={S.filterField}>
              <label style={S.filterLabel}>From date</label>
              <input type="date" value={filters.fromDate||''} onChange={e=>onFilterChange('fromDate',e.target.value)} style={S.filterInput}/>
            </div>
            <div style={S.filterField}>
              <label style={S.filterLabel}>To date</label>
              <input type="date" value={filters.toDate||''} onChange={e=>onFilterChange('toDate',e.target.value)} style={S.filterInput}/>
            </div>
            {hasFilters && (
              <button onClick={onClearFilters} style={S.clearFiltersBtn}>✕ Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div style={S.searchRow}>
        <div style={S.searchWrap}>
          <span style={{ fontSize:'13px', opacity:0.6, flexShrink:0 }}>🔍</span>
          <input type="text" value={searchQuery} onChange={e=>onSearchChange(e.target.value)}
            placeholder="Search emails…" style={S.searchInput}/>
          {searchQuery && <button onClick={()=>onSearchChange('')} style={S.clearBtn}>✕</button>}
        </div>
      </div>

      {/* List body */}
      {loading ? (
        <div style={{ padding:'8px', flex:1 }}>
          {[...Array(6)].map((_,i)=>(
            <div key={i} style={{ ...S.skeleton, animationDelay:`${i*0.08}s` }}/>
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize:'44px', marginBottom:'12px' }}>{meta.emptyIcon}</div>
          <p style={S.emptyTitle}>{searchQuery ? 'No results found' : meta.emptyMsg}</p>
          <p style={S.emptyHint}>{searchQuery ? `Nothing matching "${searchQuery}"` : meta.emptyHint}</p>
          {hasFilters && (
            <button onClick={onClearFilters} style={S.emptyFilterBtn}>Clear filters</button>
          )}
        </div>
      ) : (
        <>
          <div style={{ overflowY:'auto', flex:1 }}>
            {emails.map(email => {
              const isSel       = email._id === selectedId;
              const isUnread    = view==='inbox' && !email.isRead;
              const isImportant = email.isImportant;
              const isDraft     = email.isDraft;
              const isScheduled = !email.isSent && email.scheduledTime;
              const isRecalled  = email.isRecalled;

              let person;
              if (view==='sent'||view==='drafts'||view==='scheduled') person = email.receiver;
              else person = email.sender;

              const label  = person?.name || person?.email || email.toEmail || 'No recipient';
              const ini    = initials(person?.name || email.toEmail || '?');
              const bg     = avatarColor(person?.name || email.toEmail || '');

              return (
                <div
                  key={email._id}
                  draggable                                              // Feature 4: drag to folder
                  onDragStart={e => handleDragStart(e, email._id)}
                  onClick={() => onSelect(email)}
                  title="Drag to a sidebar folder to organise"
                  style={{
                    ...S.item,
                    ...(isSel       ? S.itemSelected  : {}),
                    ...(isImportant ? S.itemImportant  : {}),
                    ...(isUnread && !isImportant ? { background:'#fff' } : {}),
                    ...(isRecalled  ? { opacity:0.6 }  : {}),
                  }}
                >
                  {isUnread    && <div style={S.unreadDot}/>}
                  {isImportant && <div style={S.importantStripe}/>}

                  {/* Avatar — show photo if available */}
                  <div style={{ ...S.avatar, background: bg, flexShrink:0 }}>
                    {person?.avatar
                      ? <img src={person.avatar} alt="" style={S.avatarImg}/>
                      : <span style={{ color:'white', fontSize:'11px', fontWeight:'700' }}>{ini}</span>}
                  </div>

                  <div style={S.content}>
                    <div style={S.row}>
                      <span style={{ ...S.name, fontWeight: isUnread?'600':'400' }}>{label}</span>
                      <span style={S.date}>
                        {isScheduled
                          ? format(new Date(email.scheduledTime),'MMM d h:mm a')
                          : fmtDate(email.updatedAt||email.createdAt)}
                      </span>
                    </div>

                    <div style={{ ...S.subject, fontWeight:isUnread?'600':'400' }}>
                      {isDraft     && <span style={S.draftTag}>Draft</span>}
                      {isScheduled && <span style={S.schedTag}>Scheduled</span>}
                      {isImportant && <span style={{ fontSize:'11px', flexShrink:0 }}>🔴</span>}
                      {isRecalled  && <span style={S.recalledTag}>Recalled</span>}
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {email.subject}
                      </span>
                    </div>

                    <div style={S.preview}>
                      {(email.htmlBody
                          ? email.htmlBody.replace(/<[^>]*>/g,' ')
                          : email.body || '')
                        .replace(/\s+/g,' ').trim().slice(0,80) || ''}
                    </div>

                    {/* Badges */}
                    <div style={S.badges}>
                      {email.isStarred             && <span>⭐</span>}
                      {email.attachments?.length>0  && <span style={S.attBadge}>📎 {email.attachments.length}</span>}
                      {email.meetingLink            && <span>📹</span>}
                      {email.mentions?.length>0     && <span style={S.mentionBadge}>@{email.mentions.length}</span>}
                      {email.smtpSent              && <span style={S.smtpBadge}>📡</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature 3: Pagination controls */}
          <Pagination page={page} pages={pages} total={total} limit={limit} onPage={onPage}/>
        </>
      )}
    </div>
  );
}

const S = {
  container:     { width:'320px', flexShrink:0, borderRight:'1px solid var(--ms-border)', display:'flex', flexDirection:'column', background:'var(--ms-list-bg)', height:'100vh', overflow:'hidden' },
  header:        { padding:'12px 14px 10px', borderBottom:'1px solid var(--ms-border)', display:'flex', alignItems:'center', gap:'8px', background:'white' },
  title:         { fontSize:'16px', fontWeight:'600', color:'var(--ms-text-primary)', flex:1 },
  count:         { fontSize:'11px', color:'var(--ms-text-muted)', background:'#e1dfdd', borderRadius:'10px', padding:'2px 8px' },
  filterToggleBtn:      { background:'transparent', border:'1px solid transparent', borderRadius:'5px', cursor:'pointer', fontSize:'14px', padding:'3px 6px', color:'#605e5c' },
  filterToggleBtnActive:{ background:'#deecf9', border:'1px solid #b3d4f0', color:'#0078d4' },
  filterPanel:   { padding:'10px 12px', background:'#f8f9ff', borderBottom:'1px solid #d0d8f0' },
  filterRow:     { display:'flex', alignItems:'flex-end', gap:'8px', flexWrap:'wrap' },
  filterField:   { display:'flex', flexDirection:'column', gap:'3px' },
  filterLabel:   { fontSize:'10px', fontWeight:'600', color:'#605e5c', letterSpacing:'0.4px' },
  filterSelect:  { padding:'5px 8px', border:'1px solid #d0d0d0', borderRadius:'5px', fontSize:'12px', outline:'none', background:'white' },
  filterInput:   { padding:'5px 8px', border:'1px solid #d0d0d0', borderRadius:'5px', fontSize:'12px', outline:'none', background:'white' },
  clearFiltersBtn:{ padding:'5px 10px', background:'transparent', border:'1px solid #d13438', color:'#d13438', borderRadius:'5px', fontSize:'11px', fontWeight:'600', cursor:'pointer', alignSelf:'flex-end' },
  searchRow:     { padding:'7px 10px', background:'white', borderBottom:'1px solid var(--ms-border)' },
  searchWrap:    { display:'flex', alignItems:'center', gap:'6px', background:'#f3f2f1', borderRadius:'6px', padding:'6px 10px' },
  searchInput:   { flex:1, border:'none', outline:'none', background:'transparent', fontSize:'13px', color:'var(--ms-text-primary)' },
  clearBtn:      { background:'transparent', border:'none', cursor:'pointer', color:'#a19f9d', fontSize:'12px', padding:'0 2px' },
  item:          { padding:'10px 12px 10px 18px', borderBottom:'1px solid var(--ms-border)', cursor:'pointer', display:'flex', gap:'10px', alignItems:'flex-start', position:'relative', background:'white', transition:'background 0.08s' },
  itemSelected:  { background:'#deecf9', borderLeft:'3px solid #0078d4', paddingLeft:'15px' },
  itemImportant: { background:'#fff8f8' },
  importantStripe:{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background:'#d13438' },
  unreadDot:     { position:'absolute', left:'6px', top:'50%', transform:'translateY(-50%)', width:'6px', height:'6px', borderRadius:'50%', background:'#0078d4' },
  avatar:        { width:'34px', height:'34px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', marginTop:'2px' },
  avatarImg:     { width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' },
  content:       { flex:1, minWidth:0 },
  row:           { display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'2px' },
  name:          { fontSize:'13px', color:'var(--ms-text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'160px' },
  date:          { fontSize:'11px', color:'var(--ms-text-muted)', flexShrink:0, marginLeft:'4px' },
  subject:       { fontSize:'13px', color:'var(--ms-text-primary)', marginBottom:'2px', display:'flex', alignItems:'center', gap:'4px', overflow:'hidden' },
  draftTag:      { fontSize:'10px', fontWeight:'700', color:'#ca5010', background:'#fff4ce', borderRadius:'3px', padding:'1px 5px', flexShrink:0 },
  schedTag:      { fontSize:'10px', fontWeight:'700', color:'#7a5f00', background:'#fff4ce', borderRadius:'3px', padding:'1px 5px', flexShrink:0 },
  recalledTag:   { fontSize:'10px', fontWeight:'700', color:'#ca5010', background:'#fff4ce', borderRadius:'3px', padding:'1px 5px', flexShrink:0 },
  preview:       { fontSize:'12px', color:'var(--ms-text-secondary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  badges:        { display:'flex', gap:'4px', marginTop:'3px', flexWrap:'wrap', alignItems:'center' },
  attBadge:      { fontSize:'10px', color:'#605e5c', background:'#f3f2f1', borderRadius:'4px', padding:'1px 5px' },
  mentionBadge:  { fontSize:'10px', color:'#8764b8', background:'#f4f0ff', borderRadius:'4px', padding:'1px 5px', fontWeight:'700' },
  smtpBadge:     { fontSize:'10px', color:'#107c10', background:'#dff6dd', borderRadius:'4px', padding:'1px 4px' },
  empty:         { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px', color:'var(--ms-text-muted)', textAlign:'center' },
  emptyTitle:    { fontSize:'14px', fontWeight:'500', color:'var(--ms-text-secondary)', marginBottom:'5px' },
  emptyHint:     { fontSize:'12px', lineHeight:1.5 },
  emptyFilterBtn:{ marginTop:'12px', padding:'7px 14px', background:'#0078d4', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  skeleton:      { height:'68px', background:'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize:'200% 100%', borderRadius:'6px', marginBottom:'4px', animation:'pulse 1.5s ease-in-out infinite' },
};
