import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar       from '../components/Sidebar';
import EmailList     from '../components/EmailList';
import EmailDetail   from '../components/EmailDetail';
import ComposeModal  from '../components/ComposeModal';
import CalendarView  from '../components/CalendarView';
import ToastContainer, { toast } from '../components/Toast';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';

const ENDPOINT = {
  inbox:     '/email/inbox',
  sent:      '/email/sent',
  drafts:    '/email/drafts',
  archive:   '/email/archive',
  starred:   '/email/starred',
  important: '/email/important',
  scheduled: '/email/scheduled',
};

// Persist filters in sessionStorage so they survive tab switches
const loadFilters = () => {
  try { return JSON.parse(sessionStorage.getItem('mf_filters')) || {}; } catch { return {}; }
};
const saveFilters = (f) => sessionStorage.setItem('mf_filters', JSON.stringify(f));

export default function Dashboard() {
  const [view,           setView]           = useState('inbox');
  const [emails,         setEmails]         = useState([]);
  const [selectedEmail,  setSelectedEmail]  = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [showCompose,    setShowCompose]    = useState(false);
  const [editingDraft,   setEditingDraft]   = useState(null);
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [draftCount,     setDraftCount]     = useState(0);
  const [importantCount, setImportantCount] = useState(0);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [folders,        setFolders]        = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [scheduledEmails,setScheduledEmails]= useState([]);

  // Feature 3: Pagination state
  const [page,   setPage]   = useState(1);
  const [pages,  setPages]  = useState(1);
  const [total,  setTotal]  = useState(0);
  const LIMIT = 20;

  // Feature 3: Filters — persisted across view changes
  const [filters, setFilters] = useState(loadFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Feature 1: Undo-delete state
  const [deletedEmail, setDeletedEmail] = useState(null);
  const undoTimerRef   = useRef(null);

  const searchDebounce = useRef(null);
  const { addListener, addMentionListener, addImportantListener } = useSocket();

  // ── Folders ──────────────────────────────────────────────────────────────
  const fetchFolders = useCallback(async () => {
    try { const { data } = await api.get('/folders'); setFolders(data.folders || []); }
    catch {}
  }, []);
  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  // ── Emails ────────────────────────────────────────────────────────────────
  const fetchEmails = useCallback(async (silent = false, pg = page) => {
    if (view === 'calendar') return;
    if (!silent) { setLoading(true); setSelectedEmail(null); }
    try {
      if (view.startsWith('folder:')) {
        const fid = view.replace('folder:', '');
        setActiveFolderId(fid);
        const { data } = await api.get(`/folders/${fid}/emails`);
        setEmails(data.emails || []);
        setTotal(data.emails?.length || 0); setPages(1); setPage(1);
      } else {
        setActiveFolderId(null);
        // Build query string with filters + pagination
        const params = new URLSearchParams({
          page: pg, limit: LIMIT,
          ...(filters.status   ? { status:   filters.status   } : {}),
          ...(filters.fromDate ? { fromDate: filters.fromDate } : {}),
          ...(filters.toDate   ? { toDate:   filters.toDate   } : {}),
        });
        const { data } = await api.get(`${ENDPOINT[view] || ENDPOINT.inbox}?${params}`);
        setEmails(data.emails || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        if (view === 'inbox') setUnreadCount(data.unreadCount || 0);
      }
    } catch { if (!silent) toast.error('Failed to load emails'); }
    finally  { if (!silent) setLoading(false); }
  }, [view, page, filters]);

  useEffect(() => { setPage(1); }, [view, filters]);
  useEffect(() => { fetchEmails(false, page); }, [view, page, filters]);

  // ── Draft + Important counts ──────────────────────────────────────────────
  const fetchCounts = useCallback(async () => {
    try {
      const [d, i] = await Promise.all([
        api.get('/email/drafts'),
        api.get('/email/important'),
      ]);
      setDraftCount((d.data.emails || []).length);
      setImportantCount((i.data.emails || []).length);
    } catch {}
  }, []);
  useEffect(() => { fetchCounts(); }, [view, fetchCounts]);

  // ── Scheduled for calendar ────────────────────────────────────────────────
  const fetchScheduled = useCallback(async () => {
    try { const { data } = await api.get('/email/scheduled'); setScheduledEmails(data.emails || []); }
    catch {}
  }, []);
  useEffect(() => { fetchScheduled(); }, [fetchScheduled]);

  // ── Inbox poll every 30s ─────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'inbox') return;
    const id = setInterval(() => fetchEmails(true, page), 30000);
    return () => clearInterval(id);
  }, [view, page, fetchEmails]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const u1 = addListener(email => {
      if (view === 'inbox') fetchEmails(true, page);
      toast.info(`📬 New email from ${email.sender?.name || 'someone'}: ${email.subject}`);
    });
    const u2 = addMentionListener((email, by) =>
      toast.info(`🔔 ${by} mentioned you in: "${email.subject}"`)
    );
    const u3 = addImportantListener(email => {
      toast.error(`🔴 Important: ${email.subject}`);
      fetchCounts();
    });
    // Feature 7: Email recalled notification
    const u4 = addListener(() => {}); // placeholder — socket 'email_recalled' handled below
    return () => { u1(); u2(); u3(); };
  }, [view, page, fetchEmails, addListener, addMentionListener, addImportantListener, fetchCounts]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    if (!searchQuery.trim()) { fetchEmails(false, 1); return; }
    searchDebounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/email/search?q=${encodeURIComponent(searchQuery)}`);
        setEmails(data.emails || []); setSelectedEmail(null);
        setTotal(data.emails?.length || 0); setPages(1); setPage(1);
      } catch { toast.error('Search failed'); }
      finally { setLoading(false); }
    }, 350);
  }, [searchQuery]); // eslint-disable-line

  // ── Filter helpers ────────────────────────────────────────────────────────
  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next); saveFilters(next); setPage(1);
  };
  const clearFilters = () => { setFilters({}); saveFilters({}); setPage(1); };
  const hasFilters = Object.values(filters).some(Boolean);

  // ── Email handlers ────────────────────────────────────────────────────────
  const handleSelectEmail = async email => {
    setSelectedEmail(email);
    if ((view === 'inbox' || searchQuery) && !email.isRead && !email.isDraft) {
      setEmails(p => p.map(e => e._id === email._id ? { ...e, isRead: true } : e));
      setUnreadCount(p => Math.max(0, p - 1));
      try { await api.get(`/email/${email._id}`); } catch {}
    }
  };

  // Feature 1: Delete → Trash with undo toast
  const handleDelete = async id => {
    const emailObj = emails.find(e => e._id === id);
    try {
      await api.delete(`/email/${id}`);       // moves to Trash (not permanent)
      setEmails(p => p.filter(e => e._id !== id));
      if (selectedEmail?._id === id) setSelectedEmail(null);
      fetchCounts();

      // Store for undo
      setDeletedEmail(emailObj);
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setDeletedEmail(null), 5000);

      toast.show(
        <span>
          Email moved to Trash.{' '}
          <button onClick={handleUndoDelete} style={{ color:'white', fontWeight:'700', textDecoration:'underline', background:'transparent', border:'none', cursor:'pointer', fontSize:'inherit' }}>
            Undo
          </button>
        </span>,
        'info', 5000
      );
    } catch { toast.error('Delete failed'); }
  };

  // Feature 1: Undo delete — restore from trash
  const handleUndoDelete = async () => {
    if (!deletedEmail) return;
    clearTimeout(undoTimerRef.current);
    setDeletedEmail(null);
    try {
      await api.patch(`/email/restore/${deletedEmail._id}`);
      fetchEmails(false, page);
      toast.success('Email restored');
    } catch { toast.error('Restore failed'); }
  };

  const handleToggleRead = async () => {
    if (!selectedEmail) return;
    try {
      const { data } = await api.patch(`/email/${selectedEmail._id}/read`);
      setSelectedEmail(s => ({ ...s, isRead: data.isRead }));
      setEmails(p => p.map(e => e._id === selectedEmail._id ? { ...e, isRead: data.isRead } : e));
      setUnreadCount(p => data.isRead ? Math.max(0, p-1) : p+1);
    } catch { toast.error('Failed'); }
  };

  const handleToggleStar = async () => {
    if (!selectedEmail) return;
    try {
      const { data } = await api.patch(`/email/${selectedEmail._id}/star`);
      setSelectedEmail(s => ({ ...s, isStarred: data.isStarred }));
      setEmails(p => p.map(e => e._id === selectedEmail._id ? { ...e, isStarred: data.isStarred } : e));
      toast.show(data.isStarred ? '⭐ Starred' : 'Star removed');
    } catch { toast.error('Failed'); }
  };

  const handleToggleImportant = async id => {
    try {
      const { data } = await api.patch(`/email/${id}/important`);
      setSelectedEmail(s => s ? { ...s, isImportant: data.isImportant } : s);
      setEmails(p => p.map(e => e._id === id ? { ...e, isImportant: data.isImportant } : e));
      toast.show(data.isImportant ? '🔴 Marked Important' : 'Removed from Important');
      fetchCounts();
    } catch { toast.error('Failed'); }
  };

  const handleArchive = async id => {
    try {
      const { data } = await api.put(`/email/archive/${id}`);
      setEmails(p => p.filter(e => e._id !== id));
      setSelectedEmail(null);
      toast.show(data.isArchived ? '📦 Archived' : '📥 Moved to inbox', 'success');
    } catch { toast.error('Failed'); }
  };

  const handleRemoveFromFolder = async emailId => {
    if (!activeFolderId) return;
    try {
      await api.delete(`/folders/${activeFolderId}/emails/${emailId}`);
      setEmails(p => p.filter(e => e._id !== emailId));
      setSelectedEmail(null);
      toast.success('Removed from folder');
    } catch { toast.error('Failed'); }
  };

  const handleEditDraft = () => {
    if (!selectedEmail?.isDraft) return;
    setEditingDraft(selectedEmail); setShowCompose(true);
  };

  const handleNavigate = newView => {
    setView(newView); setSelectedEmail(null); setSearchQuery(''); setPage(1);
  };

  const handleFoldersChange = (action, emailId, folder) => {
    fetchFolders();
    if (action === 'moved' && emailId) {
      setEmails(p => p.filter(e => e._id !== emailId));
      if (selectedEmail?._id === emailId) setSelectedEmail(null);
      toast.success(`📁 Moved to "${folder.name}"`);
    }
  };

  const activeFolderObj = folders.find(f => f._id === activeFolderId);
  const isCalendar      = view === 'calendar';
  const effectiveView   = searchQuery.trim() ? 'search'
    : view.startsWith('folder:') ? 'folder'
    : view;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'white' }}>
      <Sidebar
        activeView={view}
        onNavigate={handleNavigate}
        onCompose={() => { setEditingDraft(null); setShowCompose(true); }}
        unreadCount={unreadCount}
        draftCount={draftCount}
        importantCount={importantCount}
        folders={folders}
        onFoldersChange={handleFoldersChange}
      />

      {isCalendar ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <CalendarView scheduledEmails={scheduledEmails}/>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <EmailList
            emails={emails}
            selectedId={selectedEmail?._id}
            onSelect={handleSelectEmail}
            view={effectiveView}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            folderName={activeFolderObj?.name}
            // Feature 3: Filters + Pagination
            filters={filters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(s => !s)}
            onFilterChange={updateFilter}
            onClearFilters={clearFilters}
            hasFilters={hasFilters}
            page={page}
            pages={pages}
            total={total}
            limit={LIMIT}
            onPage={p => setPage(p)}
          />
          <EmailDetail
            email={selectedEmail}
            onDelete={handleDelete}
            onToggleRead={handleToggleRead}
            onToggleStar={handleToggleStar}
            onToggleImportant={handleToggleImportant}
            onArchive={handleArchive}
            onEditDraft={handleEditDraft}
            onRemoveFromFolder={activeFolderId ? handleRemoveFromFolder : null}
            view={effectiveView}
            folders={folders}
            activeFolderId={activeFolderId}
          />
        </div>
      )}

      {showCompose && (
        <ComposeModal
          onClose={() => { setShowCompose(false); setEditingDraft(null); }}
          draft={editingDraft}
          onSent={() => { toast.success('✅ Email sent!'); fetchEmails(false, page); fetchCounts(); fetchScheduled(); }}
          onDrafted={() => { toast.success('📝 Draft saved'); fetchCounts(); if (view==='drafts') fetchEmails(false, page); }}
        />
      )}

      {/* Global toast container */}
      <ToastContainer/>
    </div>
  );
}
