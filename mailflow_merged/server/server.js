const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const dotenv    = require('dotenv');
const http      = require('http');
const { Server }= require('socket.io');
const path      = require('path');
const fs        = require('fs');
const cron      = require('node-cron');
const helmet    = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const Email     = require('./models/Email');
const { verifySmtp } = require('./config/nodemailer');
const { generalLimiter, authLimiter, sanitizeBody } = require('./middleware/security');

dotenv.config();

// ── Ensure upload directories ─────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
[UPLOADS_DIR, AVATARS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST'], credentials: true },
});
const userSockets = {};
io.on('connection', socket => {
  socket.on('register', uid => { userSockets[uid] = socket.id; console.log(`🔌 ${uid} connected`); });
  socket.on('disconnect', () => {
    for (const [uid, sid] of Object.entries(userSockets)) { if (sid === socket.id) { delete userSockets[uid]; break; } }
  });
});
app.set('io', io);
app.set('userSockets', userSockets);

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // Feature 11
app.use(mongoSanitize());                           // Feature 11: prevent NoSQL injection
app.use(generalLimiter);                            // Feature 11: rate limit all routes
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);                              // Feature 11: XSS clean on all fields

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.jpg','.jpeg','.png','.gif','.webp','.pdf'].includes(ext))
      res.setHeader('Content-Disposition', 'attachment');
  },
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, require('./routes/auth'));
app.use('/api/email',     require('./routes/email'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/folders',   require('./routes/folders'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/signature', require('./routes/signature'));  // Feature 2
app.use('/api/profile',   require('./routes/profile'));    // Feature 4
app.use('/api/accounts',  require('./routes/accounts'));   // Feature 5

// ── Calendar holidays ─────────────────────────────────────────────────────────
app.get('/api/calendar/holidays/:year', (req, res) => {
  const year = parseInt(req.params.year) || new Date().getFullYear();
  res.json({ events: [
    { date:`${year}-01-01`, name:"New Year's Day",             type:'holiday' },
    { date:`${year}-01-26`, name:'Republic Day (India)',        type:'holiday' },
    { date:`${year}-02-14`, name:"Valentine's Day",            type:'event'   },
    { date:`${year}-03-08`, name:"International Women's Day",  type:'event'   },
    { date:`${year}-03-21`, name:'Holi',                       type:'holiday' },
    { date:`${year}-04-14`, name:'Dr. Ambedkar Jayanti',       type:'holiday' },
    { date:`${year}-05-01`, name:"International Workers' Day", type:'holiday' },
    { date:`${year}-06-21`, name:"International Yoga Day",     type:'event'   },
    { date:`${year}-08-15`, name:'Independence Day (India)',    type:'holiday' },
    { date:`${year}-09-05`, name:"Teachers' Day (India)",      type:'event'   },
    { date:`${year}-10-02`, name:'Gandhi Jayanti',             type:'holiday' },
    { date:`${year}-10-24`, name:'Dussehra',                   type:'holiday' },
    { date:`${year}-11-01`, name:'Diwali',                     type:'holiday' },
    { date:`${year}-11-14`, name:"Children's Day (India)",     type:'event'   },
    { date:`${year}-12-25`, name:'Christmas Day',              type:'holiday' },
    { date:`${year}-12-31`, name:"New Year's Eve",             type:'event'   },
  ]});
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status:'MailFlow API Running ✅', smtp: !!process.env.SMTP_USER })
);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// ── CRON 1: Deliver scheduled emails (every minute) ──────────────────────────
cron.schedule('* * * * *', async () => {
  try {
    const due = await Email.find({
      isDraft: false, isSent: false,
      scheduledTime: { $ne: null, $lte: new Date() }, receiver: { $ne: null },
    });
    for (const email of due) {
      email.isSent = true; email.deliveredAt = new Date();
      await email.save();
      const sid = userSockets[email.receiver.toString()];
      if (sid) {
        const pop = await Email.findById(email._id).populate('sender','name email').populate('receiver','name email');
        io.to(sid).emit('new_email', pop);
        if (pop.isImportant) io.to(sid).emit('important_email', pop);
      }
      console.log(`📨 Scheduled email ${email._id} delivered`);
    }
  } catch (err) { console.error('Scheduled cron:', err.message); }
});

// ── CRON 2: Feature 1 — Auto-delete trash after 30 days (daily at 2 AM) ──────
cron.schedule('0 2 * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Email.deleteMany({ trashedAt: { $lte: cutoff },
      $or: [{ trashedBySender: true }, { trashedByReceiver: true }] });
    if (result.deletedCount > 0)
      console.log(`🗑️  Auto-deleted ${result.deletedCount} trashed emails older than 30 days`);
  } catch (err) { console.error('Trash cron:', err.message); }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await verifySmtp();
    server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB:', err.message); process.exit(1); });
