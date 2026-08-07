const express      = require('express');
const router       = express.Router();
const User         = require('../models/User');
const Email        = require('../models/Email');
const AdminLog     = require('../models/AdminLog');
const ActivityLog  = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

const log = async (req, action, target = '', detail = '') => {
  try { await AdminLog.create({ admin: req.user._id, action, target, detail, ip: req.ip || '' }); } catch {}
};

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [totalUsers, totalEmails, activeUsers, sentToday, trashCount, deletedCount] = await Promise.all([
      User.countDocuments(),
      Email.countDocuments({ isDraft: false, isSent: true }),
      User.countDocuments({ isActive: true }),
      Email.countDocuments({ isSent: true, createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      Email.countDocuments({ $or: [{ trashedBySender: true }, { trashedByReceiver: true }] }),
      Email.countDocuments({ $or: [{ deletedBySender: true }, { deletedByReceiver: true }] }),
    ]);
    const recentEmails = await Email.find({ isDraft: false, isSent: true })
      .sort({ createdAt: -1 }).limit(10)
      .populate('sender', 'name email avatar').populate('receiver', 'name email avatar')
      .select('subject sender receiver createdAt attachments smtpSent isRecalled');
    const recentLogs = await AdminLog.find().sort({ createdAt: -1 }).limit(20).populate('admin', 'name email');
    const activityLogs = await ActivityLog.find().sort({ createdAt: -1 }).limit(20).populate('user', 'name email');
    res.json({ stats: { totalUsers, totalEmails, activeUsers, sentToday, trashCount, deletedCount }, recentEmails, recentLogs, activityLogs });
  } catch { res.status(500).json({ message: 'Failed to fetch dashboard stats' }); }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const page   = parseInt(req.query.page  || '1');
    const limit  = parseInt(req.query.limit || '20');
    const search = req.query.search || '';
    const filter = search ? { $or: [{ name: new RegExp(search,'i') }, { email: new RegExp(search,'i') }] } : {};
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, page, pages: Math.ceil(total/limit) });
  } catch { res.status(500).json({ message: 'Failed to fetch users' }); }
});

// PATCH /api/admin/users/:id/toggle-active
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot suspend admin' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    await log(req, user.isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER', user._id.toString(), user.email);
    res.json({ message: `User ${user.isActive?'activated':'suspended'}`, isActive: user.isActive });
  } catch { res.status(500).json({ message: 'Failed to update user' }); }
});

// PATCH /api/admin/users/:id/make-admin
router.patch('/users/:id/make-admin', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await log(req, 'PROMOTE_ADMIN', user._id.toString(), user.email);
    res.json({ message: 'Promoted to admin', user });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Password must be 6+ characters' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = newPassword;
    await user.save();
    await log(req, 'RESET_PASSWORD', user._id.toString(), user.email);
    res.json({ message: 'Password reset successfully' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin' });
    await log(req, 'DELETE_USER', user._id.toString(), `${user.name} <${user.email}>`);
    await Email.updateMany({ sender: user._id }, { deletedBySender: true });
    await Email.updateMany({ receiver: user._id }, { deletedByReceiver: true });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch { res.status(500).json({ message: 'Failed to delete user' }); }
});

// GET /api/admin/emails
router.get('/emails', async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const emails = await Email.find({ isDraft: false })
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
      .populate('sender', 'name email').populate('receiver', 'name email')
      .select('-body -htmlBody');
    const total = await Email.countDocuments({ isDraft: false });
    res.json({ emails, total, page, pages: Math.ceil(total/limit) });
  } catch { res.status(500).json({ message: 'Failed to fetch emails' }); }
});

// DELETE /api/admin/emails/:id
router.delete('/emails/:id', async (req, res) => {
  try {
    const email = await Email.findById(req.params.id);
    if (!email) return res.status(404).json({ message: 'Email not found' });
    await log(req, 'DELETE_EMAIL', email._id.toString(), email.subject);
    await email.deleteOne();
    res.json({ message: 'Email deleted by admin' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/admin/logs
router.get('/logs', async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '30');
    const logs  = await AdminLog.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).populate('admin', 'name email');
    const total = await AdminLog.countDocuments();
    res.json({ logs, total, page, pages: Math.ceil(total/limit) });
  } catch { res.status(500).json({ message: 'Failed to fetch logs' }); }
});

// GET /api/admin/activity
router.get('/activity', async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '30');
    const logs  = await ActivityLog.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).populate('user', 'name email');
    const total = await ActivityLog.countDocuments();
    res.json({ logs, total, page, pages: Math.ceil(total/limit) });
  } catch { res.status(500).json({ message: 'Failed to fetch activity' }); }
});

module.exports = router;
