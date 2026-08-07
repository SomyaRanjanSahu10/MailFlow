const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const Email    = require('../models/Email');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const sendMail = require('../utils/sendMail');

// ── Helpers ───────────────────────────────────────────────────────────────────
const populate = q =>
  q.populate('sender', 'name email avatar designation')
   .populate('receiver', 'name email avatar designation');

function notify(req, userId, event, payload) {
  const io  = req.app.get('io');
  const sid = (req.app.get('userSockets') || {})[userId?.toString()];
  if (io && sid) io.to(sid).emit(event, payload);
}

async function parseMentions(raw) {
  if (!raw) return [];
  const emails = raw.split(',').map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const e of emails) {
    const u = await User.findOne({ email: e.toLowerCase() });
    if (u) out.push({ user: u._id, email: u.email, name: u.name });
  }
  return out;
}

const mapFiles = (files = []) => files.map(f => ({
  originalName: f.originalname, filename: f.filename,
  mimetype: f.mimetype, size: f.size, path: f.path,
}));

// ── Feature 3: Pagination helper ──────────────────────────────────────────────
function paginateQuery(query, req) {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  return query.skip((page - 1) * limit).limit(limit);
}
function dateFilter(req) {
  const filter = {};
  if (req.query.fromDate) filter.$gte = new Date(req.query.fromDate);
  if (req.query.toDate)   filter.$lte = new Date(new Date(req.query.toDate).setHours(23, 59, 59));
  return Object.keys(filter).length ? filter : null;
}

// ── POST /api/email/send ─────────────────────────────────────────────────────
router.post('/send', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, body, htmlBody, meetingLink, cc, bcc, isImportant, mentions } = req.body;
    if (!to || !subject) return res.status(400).json({ message: 'Recipient and subject are required' });

    const receiver = await User.findOne({ email: to.toLowerCase() });
    if (!receiver) return res.status(404).json({ message: `No user found with email: ${to}` });
    if (receiver._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'You cannot send an email to yourself' });

    const mentionList = await parseMentions(mentions);
    const attachments = mapFiles(req.files);

    const email = await Email.create({
      sender: req.user._id, receiver: receiver._id, toEmail: to.toLowerCase(),
      subject, body: body || '', htmlBody: htmlBody || '',
      meetingLink: meetingLink || '',
      cc:  cc  ? cc.split(',').map(e => e.trim()).filter(Boolean)  : [],
      bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
      isImportant: isImportant === 'true' || isImportant === true,
      mentions: mentionList, attachments, isSent: true, deliveredAt: new Date(),
    });

    const populated = await populate(Email.findById(email._id));
    notify(req, receiver._id, 'new_email', populated);
    if (email.isImportant) notify(req, receiver._id, 'important_email', populated);
    for (const m of mentionList)
      if (m.user.toString() !== receiver._id.toString())
        notify(req, m.user, 'mention', { email: populated, mentionedBy: req.user.name });

    let smtpSent = false;
    try {
      await sendMail({ to: receiver.email, subject, text: body || '', html: htmlBody || body || '',
        attachments: (req.files || []).map(f => ({ filename: f.originalname, path: f.path })) });
      smtpSent = true;
    } catch (e) { await Email.findByIdAndUpdate(email._id, { smtpError: e.message }); }
    await Email.findByIdAndUpdate(email._id, { smtpSent });

    res.status(201).json({ message: 'Email sent successfully', email: populated, smtpSent });
  } catch (err) { console.error(err); res.status(500).json({ message: err.message || 'Server error' }); }
});

// ── POST /api/email/draft ─────────────────────────────────────────────────────
router.post('/draft', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { draftId, to, subject, body, htmlBody, meetingLink, cc, bcc, isImportant, mentions } = req.body;
    const receiver    = to ? await User.findOne({ email: to.toLowerCase() }) : null;
    const attachments = mapFiles(req.files);
    const mentionList = await parseMentions(mentions);

    if (draftId) {
      const draft = await Email.findOne({ _id: draftId, sender: req.user._id, isDraft: true });
      if (!draft) return res.status(404).json({ message: 'Draft not found' });
      Object.assign(draft, {
        receiver: receiver?._id || null, toEmail: to?.toLowerCase() || '',
        subject: subject || draft.subject, body: body !== undefined ? body : draft.body,
        htmlBody: htmlBody !== undefined ? htmlBody : draft.htmlBody,
        meetingLink: meetingLink || '',
        cc:  cc  ? cc.split(',').map(e => e.trim()).filter(Boolean)  : [],
        bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
        isImportant: isImportant === 'true' || isImportant === true,
        mentions: mentionList,
      });
      if (attachments.length) draft.attachments.push(...attachments);
      await draft.save();
      return res.json({ message: 'Draft updated', email: await populate(Email.findById(draft._id)) });
    }

    const email = await Email.create({
      sender: req.user._id, receiver: receiver?._id || null,
      toEmail: to?.toLowerCase() || '', subject: subject || '(No Subject)',
      body: body || '', htmlBody: htmlBody || '', meetingLink: meetingLink || '',
      cc:  cc  ? cc.split(',').map(e => e.trim()).filter(Boolean)  : [],
      bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
      isImportant: isImportant === 'true' || isImportant === true,
      mentions: mentionList, attachments, isDraft: true,
    });
    res.status(201).json({ message: 'Draft saved', email: await populate(Email.findById(email._id)) });
  } catch (err) { res.status(500).json({ message: 'Error saving draft' }); }
});

// ── POST /api/email/draft/:id/send ───────────────────────────────────────────
router.post('/draft/:id/send', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const draft = await Email.findOne({ _id: req.params.id, sender: req.user._id, isDraft: true });
    if (!draft) return res.status(404).json({ message: 'Draft not found' });
    const { to, subject, body, htmlBody } = req.body;
    const toEmail = (to || draft.toEmail || '').toLowerCase();
    if (!toEmail) return res.status(400).json({ message: 'Recipient required' });
    const receiver = await User.findOne({ email: toEmail });
    if (!receiver) return res.status(404).json({ message: `No user: ${toEmail}` });

    Object.assign(draft, {
      receiver: receiver._id, toEmail, subject: subject || draft.subject,
      body: body || draft.body, htmlBody: htmlBody || draft.htmlBody,
      isDraft: false, isSent: true, deliveredAt: new Date(),
    });
    const newAtts = mapFiles(req.files);
    if (newAtts.length) draft.attachments.push(...newAtts);
    await draft.save();

    const populated = await populate(Email.findById(draft._id));
    notify(req, receiver._id, 'new_email', populated);
    let smtpSent = false;
    try { await sendMail({ to: receiver.email, subject: draft.subject, text: draft.body, html: draft.htmlBody || draft.body }); smtpSent = true; } catch {}
    await Email.findByIdAndUpdate(draft._id, { smtpSent });
    res.json({ message: 'Draft sent', email: populated, smtpSent });
  } catch (err) { res.status(500).json({ message: 'Error sending draft' }); }
});

// ── POST /api/email/schedule ─────────────────────────────────────────────────
router.post('/schedule', protect, upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, body, htmlBody, scheduledTime, meetingLink, cc, bcc, isImportant, mentions } = req.body;
    if (!to || !subject || !scheduledTime)
      return res.status(400).json({ message: 'to, subject, scheduledTime required' });
    const sendAt = new Date(scheduledTime);
    if (isNaN(sendAt) || sendAt <= new Date())
      return res.status(400).json({ message: 'scheduledTime must be a valid future time' });
    const receiver = await User.findOne({ email: to.toLowerCase() });
    if (!receiver) return res.status(404).json({ message: `No user: ${to}` });
    const email = await Email.create({
      sender: req.user._id, receiver: receiver._id, toEmail: to.toLowerCase(),
      subject, body: body || '', htmlBody: htmlBody || '',
      meetingLink: meetingLink || '',
      cc: cc ? cc.split(',').map(e=>e.trim()).filter(Boolean) : [],
      bcc: bcc ? bcc.split(',').map(e=>e.trim()).filter(Boolean) : [],
      isImportant: isImportant === 'true' || isImportant === true,
      mentions: await parseMentions(mentions),
      attachments: mapFiles(req.files),
      scheduledTime: sendAt, isSent: false, isDraft: false,
    });
    const populated = await populate(Email.findById(email._id));
    res.status(201).json({ message: `Scheduled for ${sendAt.toISOString()}`, email: populated });
  } catch (err) { res.status(500).json({ message: 'Error scheduling email' }); }
});

// ── GET /api/email/inbox ──────────────────────────────────────────────────────
router.get('/inbox', protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const dateF = dateFilter(req);
    const filter = {
      receiver: uid, isDraft: false, isSent: true, isArchived: false,
      trashedByReceiver: false, deletedByReceiver: false, isRecalled: false,
    };
    if (req.query.status === 'unread') filter.isRead = false;
    if (req.query.status === 'read')   filter.isRead = true;
    if (dateF) filter.createdAt = dateF;

    const total  = await Email.countDocuments(filter);
    const emails = await paginateQuery(populate(Email.find(filter).sort({ createdAt: -1 })), req);
    res.json({ emails, unreadCount: await Email.countDocuments({ ...filter, isRead: false }), total,
      page: parseInt(req.query.page) || 1, pages: Math.ceil(total / (parseInt(req.query.limit) || 20)) });
  } catch { res.status(500).json({ message: 'Error fetching inbox' }); }
});

// ── GET /api/email/sent ───────────────────────────────────────────────────────
router.get('/sent', protect, async (req, res) => {
  try {
    const dateF = dateFilter(req);
    const filter = { sender: req.user._id, isDraft: false, isSent: true,
      scheduledTime: null, deletedBySender: false, trashedBySender: false };
    if (dateF) filter.createdAt = dateF;
    const total  = await Email.countDocuments(filter);
    const emails = await paginateQuery(populate(Email.find(filter).sort({ createdAt: -1 })), req);
    res.json({ emails, total, page: parseInt(req.query.page)||1, pages: Math.ceil(total/(parseInt(req.query.limit)||20)) });
  } catch { res.status(500).json({ message: 'Error fetching sent' }); }
});

// ── GET /api/email/drafts ─────────────────────────────────────────────────────
router.get('/drafts', protect, async (req, res) => {
  try {
    const emails = await populate(Email.find({ sender: req.user._id, isDraft: true }).sort({ updatedAt: -1 }));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error fetching drafts' }); }
});

// ── GET /api/email/starred ────────────────────────────────────────────────────
router.get('/starred', protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const emails = await populate(Email.find({
      isStarred: true,
      $and: [
        { $or: [{ sender: uid }, { receiver: uid }] },
        { $or: [{ sender: uid, deletedBySender: false }, { receiver: uid, deletedByReceiver: false }] },
      ],
    }).sort({ createdAt: -1 }));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error fetching starred' }); }
});

// ── GET /api/email/important ──────────────────────────────────────────────────
router.get('/important', protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const emails = await populate(Email.find({
      isImportant: true, isDraft: false, isSent: true,
      $or: [{ receiver: uid, deletedByReceiver: false }, { sender: uid, deletedBySender: false }],
    }).sort({ createdAt: -1 }));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error fetching important' }); }
});

// ── GET /api/email/archive ────────────────────────────────────────────────────
router.get('/archive', protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const emails = await populate(Email.find({
      isArchived: true, isDraft: false,
      $or: [{ sender: uid, deletedBySender: false }, { receiver: uid, deletedByReceiver: false }],
    }).sort({ createdAt: -1 }));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error fetching archive' }); }
});

// ── GET /api/email/scheduled ──────────────────────────────────────────────────
router.get('/scheduled', protect, async (req, res) => {
  try {
    const emails = await populate(Email.find({
      sender: req.user._id, isDraft: false, isSent: false, scheduledTime: { $ne: null },
    }).sort({ scheduledTime: 1 }));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error fetching scheduled' }); }
});

// ── Feature 1: GET /api/email/trash ──────────────────────────────────────────
router.get('/trash', protect, async (req, res) => {
  try {
    const uid = req.user._id;
    const emails = await populate(Email.find({
      $or: [
        { sender: uid, trashedBySender: true, deletedBySender: false },
        { receiver: uid, trashedByReceiver: true, deletedByReceiver: false },
      ],
    }).sort({ trashedAt: -1 }));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error fetching trash' }); }
});

// ── GET /api/email/search ─────────────────────────────────────────────────────
router.get('/search', protect, async (req, res) => {
  try {
    const q   = req.query.q || '';
    const uid = req.user._id;
    const rx  = new RegExp(q, 'i');
    const emails = await populate(Email.find({
      isDraft: false, trashedBySender: false, trashedByReceiver: false,
      $and: [
        { $or: [{ receiver: uid, deletedByReceiver: false }, { sender: uid, deletedBySender: false }] },
        { $or: [{ subject: rx }, { body: rx }, { toEmail: rx }] },
      ],
    }).sort({ createdAt: -1 }).limit(50));
    res.json({ emails });
  } catch { res.status(500).json({ message: 'Error searching' }); }
});

// ── GET /api/email/:id ────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const email = await populate(Email.findById(req.params.id));
    if (!email) return res.status(404).json({ message: 'Email not found' });
    const uid = req.user._id.toString();
    if (email.receiver?._id?.toString() === uid && !email.isRead) {
      await Email.findByIdAndUpdate(req.params.id, { isRead: true, openedAt: new Date() });
    }
    res.json({ email });
  } catch { res.status(500).json({ message: 'Error fetching email' }); }
});

// ── PATCH /api/email/:id/read ─────────────────────────────────────────────────
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    email.isRead = !email.isRead;
    if (email.isRead && !email.openedAt) email.openedAt = new Date();
    await email.save();
    res.json({ isRead: email.isRead });
  } catch { res.status(500).json({ message: 'Error updating read' }); }
});

// ── PATCH /api/email/:id/star ─────────────────────────────────────────────────
router.patch('/:id/star', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    email.isStarred = !email.isStarred;
    await email.save();
    res.json({ isStarred: email.isStarred });
  } catch { res.status(500).json({ message: 'Error updating star' }); }
});

// ── PATCH /api/email/:id/important ───────────────────────────────────────────
router.patch('/:id/important', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    email.isImportant = !email.isImportant;
    await email.save();
    res.json({ isImportant: email.isImportant });
  } catch { res.status(500).json({ message: 'Error updating important' }); }
});

// ── PUT /api/email/archive/:id ────────────────────────────────────────────────
router.put('/archive/:id', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    email.isArchived = !email.isArchived;
    await email.save();
    res.json({ isArchived: email.isArchived });
  } catch { res.status(500).json({ message: 'Error archiving' }); }
});

// ── Feature 1: DELETE /api/email/:id → move to Trash ─────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    const uid = req.user._id.toString();
    let changed = false;
    if (email.sender.toString()    === uid && !email.trashedBySender)   { email.trashedBySender   = true; changed = true; }
    if (email.receiver?.toString() === uid && !email.trashedByReceiver) { email.trashedByReceiver  = true; changed = true; }
    if (changed && !email.trashedAt) email.trashedAt = new Date();
    await email.save();
    res.json({ message: 'Email moved to Trash' });
  } catch { res.status(500).json({ message: 'Error deleting email' }); }
});

// ── Feature 1: PATCH /api/email/restore/:id ───────────────────────────────────
router.patch('/restore/:id', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    const uid = req.user._id.toString();
    if (email.sender.toString()    === uid) email.trashedBySender   = false;
    if (email.receiver?.toString() === uid) email.trashedByReceiver = false;
    // Clear trashedAt only when both restored
    if (!email.trashedBySender && !email.trashedByReceiver) email.trashedAt = null;
    await email.save();
    res.json({ message: 'Email restored' });
  } catch { res.status(500).json({ message: 'Error restoring email' }); }
});

// ── Feature 1: DELETE /api/email/permanent/:id ────────────────────────────────
router.delete('/permanent/:id', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    const uid = req.user._id.toString();
    if (email.sender.toString()    === uid) email.deletedBySender   = true;
    if (email.receiver?.toString() === uid) email.deletedByReceiver = true;
    if (email.deletedBySender && (email.deletedByReceiver || !email.receiver)) {
      await email.deleteOne();
    } else {
      await email.save();
    }
    res.json({ message: 'Email permanently deleted' });
  } catch { res.status(500).json({ message: 'Error permanently deleting' }); }
});

// ── Feature 7: PATCH /api/email/recall/:id ────────────────────────────────────
router.patch('/recall/:id', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    if (email.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only sender can recall' });
    if (!email.isSent || email.isDraft)
      return res.status(400).json({ message: 'Only sent emails can be recalled' });
    if (email.isRecalled)
      return res.status(400).json({ message: 'Already recalled' });
    // 2-minute recall window
    const sentAt  = email.deliveredAt || email.createdAt;
    const elapsed = (Date.now() - new Date(sentAt).getTime()) / 1000 / 60;
    if (elapsed > 2)
      return res.status(400).json({ message: 'Recall window expired (2 minutes)' });

    email.isRecalled = true;
    email.recalledAt = new Date();
    await email.save();

    // Notify receiver in real-time
    notify(req, email.receiver, 'email_recalled', { emailId: email._id });
    res.json({ message: 'Email recalled successfully', email });
  } catch { res.status(500).json({ message: 'Error recalling email' }); }
});

// ── GET /api/email/:id/attachments/:attId — authenticated download ────────────
router.get('/:id/attachments/:attId', protect, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    const uid = req.user._id.toString();
    if (email.sender.toString() !== uid && email.receiver?.toString() !== uid)
      return res.status(403).json({ message: 'Access denied' });

    const att = email.attachments.id(req.params.attId);
    if (!att) return res.status(404).json({ message: 'Attachment not found' });

    const UPLOADS_DIR = path.join(__dirname, '../uploads');
    let filePath = att.path || path.join(UPLOADS_DIR, att.filename);
    if (!fs.existsSync(filePath)) filePath = path.join(UPLOADS_DIR, att.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });
    if (!path.resolve(filePath).startsWith(path.resolve(UPLOADS_DIR)))
      return res.status(403).json({ message: 'Access denied' });

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', att.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.originalName)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch { res.status(500).json({ message: 'Error downloading attachment' }); }
});

module.exports = router;
