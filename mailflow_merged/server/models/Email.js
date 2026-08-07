const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename:     { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
  path:         { type: String, required: true },
}, { _id: true });

const MentionSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  name:  { type: String, required: true },
}, { _id: false });

const EmailSchema = new mongoose.Schema(
  {
    sender:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toEmail:  { type: String, default: '' },

    subject:  { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 200 },
    body:     { type: String, default: '' },
    htmlBody: { type: String, default: '' }, // rich-text HTML (Feature 6)

    // ── Status flags ──────────────────────────────────────────────────────────
    isRead:      { type: Boolean, default: false },
    isStarred:   { type: Boolean, default: false },
    isImportant: { type: Boolean, default: false },
    isDraft:     { type: Boolean, default: false },
    isArchived:  { type: Boolean, default: false },
    isSent:      { type: Boolean, default: false },

    // ── Feature 1: Trash system ───────────────────────────────────────────────
    trashedBySender:   { type: Boolean, default: false },
    trashedByReceiver: { type: Boolean, default: false },
    trashedAt:         { type: Date,   default: null },   // for 30-day auto-cleanup
    deletedBySender:   { type: Boolean, default: false }, // permanent
    deletedByReceiver: { type: Boolean, default: false }, // permanent

    // ── Feature 7: Mail recall ─────────────────────────────────────────────────
    isRecalled:  { type: Boolean, default: false },
    recalledAt:  { type: Date,   default: null },

    // ── Scheduling ────────────────────────────────────────────────────────────
    scheduledTime: { type: Date,   default: null },
    meetingLink:   { type: String, default: '' },

    // ── Recipients ────────────────────────────────────────────────────────────
    cc:  { type: [String], default: [] },
    bcc: { type: [String], default: [] },

    // ── Relations ────────────────────────────────────────────────────────────
    folder:      { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    mentions:    { type: [MentionSchema],    default: [] },
    attachments: { type: [AttachmentSchema], default: [] },

    // ── Tracking ──────────────────────────────────────────────────────────────
    deliveredAt: { type: Date, default: null },
    openedAt:    { type: Date, default: null },
    smtpSent:    { type: Boolean, default: false },
    smtpError:   { type: String,  default: null },
  },
  { timestamps: true }
);

EmailSchema.index({ subject: 'text', body: 'text' });
// Feature 1: index for trash auto-cleanup cron
EmailSchema.index({ trashedAt: 1 }, { sparse: true });

module.exports = mongoose.model('Email', EmailSchema);
