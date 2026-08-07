# MailFlow — Complete Full-Featured Email Application

A production-ready, Outlook/Gmail-like email client built with the MERN stack — **MongoDB, Express.js, React.js, Node.js** — plus Socket.IO, nodemailer, and ReactQuill.

---

## ✨ Complete Feature List

| # | Feature | Details |
|---|---|---|
| 1 | **Trash / Delete System** | Move to trash, 30-day auto-cleanup cron, undo-delete toast, restore, permanent delete |
| 2 | **Email Signature** | Create signature (name, role, company, phone, regards), live preview, auto-append on compose |
| 3 | **Filters + Pagination** | Filter by status/date, paginated list (20/page), persisted across navigation |
| 4 | **Profile Card with DP** | Upload avatar, hover profile card shows name/email/role/dept/phone |
| 5 | **Multi-Account Switching** | Add accounts, switch without logout, session management |
| 6 | **Rich Text Editor** | ReactQuill — bold/italic/underline/colour/alignment/lists/links, HTML saved + sanitized |
| 7 | **Mail Recall** | Recall sent email within 2 minutes, receiver sees email disappear |
| 8 | **Attachment Preview** | Upload files, image preview modal, authenticated download, file type icons |
| 9 | **Admin Panel** | Dashboard stats, user management (block/delete/reset PW/promote), email logs, activity logs |
| 10 | **Forgot Password via SMTP** | 3-step OTP flow: request → verify OTP → reset, 10-min expiry |
| 11 | **Security** | Helmet, rate limiting, mongo-sanitize, XSS protection, JWT, bcrypt, CORS |
| + | **Inbox / Sent / Drafts** | Full email management with Cc, Bcc, important flag |
| + | **Real-time Notifications** | Socket.IO — new email, @mentions, important flag |
| + | **Calendar View** | Scheduled emails + 16 India/world holidays |
| + | **Custom Folders** | Create, rename, delete folders; drag-and-drop emails |
| + | **Scheduling** | Schedule emails for future delivery (cron every minute) |
| + | **SMTP Sending** | Send real emails via Gmail SMTP (nodemailer) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)

### 1 — Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd client && npm install
```

### 2 — Configure environment

Edit **`server/.env`**:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mailflow
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000

# ── Gmail SMTP (optional but recommended) ────────────────────────────────────
# 1. Enable 2-Step Verification: myaccount.google.com
# 2. Security → App passwords → generate for "Mail"
# 3. Paste the 16-char code (NO spaces) as SMTP_PASS
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM_NAME=MailFlow
```

> **Without SMTP**: App works fully — emails delivered via Socket.IO in real-time.
> Dev mode returns `_devOTP` in forgot-password response for testing.

### 3 — Seed the database

```bash
cd server && node seed.js
```

| Email | Password | Role |
|---|---|---|
| user1@test.com | 123456 | user |
| user2@test.com | 123456 | user |
| admin@test.com | admin123 | **admin** |

### 4 — Run

```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm start
```

Open **http://localhost:3000**

---

## 📁 Project Structure

```
mailflow/
├── server/
│   ├── config/
│   │   └── nodemailer.js           SMTP transporter (Gmail)
│   ├── middleware/
│   │   ├── auth.js                 JWT protect + adminOnly
│   │   ├── security.js             Rate limit, XSS, sanitize, activity logger
│   │   └── upload.js               Multer (10 MB, 5 files max)
│   ├── models/
│   │   ├── User.js                 role, avatar, profile, sessions, reset fields
│   │   ├── Email.js                isImportant, mentions, trash, recall, htmlBody
│   │   ├── Folder.js               Custom user folders
│   │   ├── Signature.js            Email signature per user
│   │   ├── AdminLog.js             Admin action audit trail
│   │   └── ActivityLog.js          All user activity logs
│   ├── routes/
│   │   ├── auth.js                 register, login, forgot/verify-OTP/reset
│   │   ├── email.js                send, draft, schedule, inbox, trash, recall, download
│   │   ├── admin.js                dashboard, users, emails, logs, activity
│   │   ├── folders.js              CRUD + move emails
│   │   ├── signature.js            GET/POST/DELETE signature
│   │   ├── profile.js              GET/PUT profile + avatar upload
│   │   ├── accounts.js             multi-account session management
│   │   └── users.js                search autocomplete
│   ├── utils/
│   │   ├── sendMail.js             nodemailer wrapper
│   │   └── emailTemplates.js       HTML: OTP, welcome, password changed
│   ├── uploads/                    File attachments (auto-created)
│   │   └── avatars/                Profile pictures
│   ├── server.js                   Express + Socket.IO + cron jobs + security
│   └── seed.js
│
└── client/src/
    ├── context/
    │   ├── AuthContext.js          login/register/logout + multi-account
    │   └── SocketContext.js        new_email, mention, important_email events
    ├── pages/
    │   ├── Login.js                sign in + forgot password link
    │   ├── Register.js             create account
    │   ├── ForgotPassword.js       3-step OTP flow
    │   ├── Dashboard.js            main app + filters + pagination + trash flow
    │   ├── TrashPage.js            trash list, restore, permanent delete
    │   ├── SignaturePage.js        create/edit signature + live preview
    │   ├── ProfilePage.js          edit profile + upload avatar
    │   └── AdminDashboard.js       tabbed admin panel
    ├── components/
    │   ├── Sidebar.js              nav + folders + account switcher + notifications
    │   ├── EmailList.js            list + filter panel + pagination + drag-and-drop
    │   ├── EmailDetail.js          reader + recall + HTML render + auth download
    │   ├── ComposeModal.js         ReactQuill editor + auto signature + Cc/Bcc
    │   ├── CalendarView.js         month grid + holidays + scheduled emails
    │   ├── ProfileCard.js          hover card with avatar + profile info
    │   ├── AccountSwitcher.js      multi-account dropdown
    │   ├── Toast.js                global toast notifications
    │   └── Pagination.js           smart page controls
    └── utils/api.js                axios + JWT + FormData fix
```

---

## 📦 npm Packages to Install

### Backend
```bash
npm install bcryptjs cors dotenv express express-mongo-sanitize \
  express-rate-limit helmet jsonwebtoken mongoose multer \
  nodemailer node-cron socket.io uuid xss
npm install --save-dev nodemon
```

### Frontend
```bash
npm install axios date-fns dompurify react-quill react-router-dom socket.io-client
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET  | `/api/auth/me` | Current user |
| POST | `/api/auth/forgot-password` | Send OTP |
| POST | `/api/auth/verify-otp` | Verify OTP → resetToken |
| POST | `/api/auth/reset-password` | Set new password |

### Email
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/email/send` | Send email (multipart) |
| POST | `/api/email/draft` | Save/update draft |
| POST | `/api/email/draft/:id/send` | Send existing draft |
| POST | `/api/email/schedule` | Schedule future send |
| GET  | `/api/email/inbox` | `?page&limit&status&fromDate&toDate` |
| GET  | `/api/email/sent` | `?page&limit&fromDate&toDate` |
| GET  | `/api/email/drafts` | — |
| GET  | `/api/email/starred` | — |
| GET  | `/api/email/important` | — |
| GET  | `/api/email/archive` | — |
| GET  | `/api/email/scheduled` | — |
| GET  | `/api/email/trash` | **Feature 1** |
| GET  | `/api/email/search?q=` | Full-text search |
| PATCH| `/api/email/:id/read` | Toggle read |
| PATCH| `/api/email/:id/star` | Toggle star |
| PATCH| `/api/email/:id/important` | Toggle important |
| PUT  | `/api/email/archive/:id` | Toggle archive |
| DELETE | `/api/email/:id` | **Move to Trash** |
| PATCH | `/api/email/restore/:id` | **Restore from Trash** |
| DELETE | `/api/email/permanent/:id` | **Permanent delete** |
| PATCH | `/api/email/recall/:id` | **Recall within 2 min** |
| GET  | `/api/email/:id/attachments/:attId` | Auth download |

### Signature (Feature 2)
| Method | Endpoint |
|---|---|
| GET | `/api/signature` |
| POST | `/api/signature` |
| DELETE | `/api/signature` |

### Profile (Feature 4)
| Method | Endpoint |
|---|---|
| GET | `/api/profile` |
| GET | `/api/profile/:userId` |
| PUT | `/api/profile` |
| POST | `/api/profile/avatar` |

### Accounts (Feature 5)
| Method | Endpoint |
|---|---|
| GET | `/api/accounts` |
| POST | `/api/accounts/add` |
| DELETE | `/api/accounts/logout-session` |

### Admin (admin role only)
| Method | Endpoint |
|---|---|
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/users?search&page` |
| PATCH | `/api/admin/users/:id/toggle-active` |
| PATCH | `/api/admin/users/:id/make-admin` |
| PATCH | `/api/admin/users/:id/reset-password` |
| DELETE | `/api/admin/users/:id` |
| GET | `/api/admin/emails?page` |
| DELETE | `/api/admin/emails/:id` |
| GET | `/api/admin/logs?page` |
| GET | `/api/admin/activity?page` |

### Folders
| Method | Endpoint |
|---|---|
| GET/POST | `/api/folders` |
| PUT/DELETE | `/api/folders/:id` |
| PUT | `/api/folders/:id/emails/:emailId` |
| DELETE | `/api/folders/:id/emails/:emailId` |
| GET | `/api/folders/:id/emails` |

---

## 🧪 Testing with Postman

```bash
# 1. Login
POST http://localhost:5000/api/auth/login
{ "email": "user1@test.com", "password": "123456" }
# → copy token

# 2. Send email with attachment + important flag
POST http://localhost:5000/api/email/send
Authorization: Bearer <token>
Body: form-data
  to          → user2@test.com
  subject     → Hello
  htmlBody    → <b>Hello World</b>
  isImportant → true
  attachments → [file]

# 3. Move to trash
DELETE http://localhost:5000/api/email/:id
Authorization: Bearer <token>

# 4. Restore from trash
PATCH http://localhost:5000/api/email/restore/:id

# 5. Recall sent email (within 2 min)
PATCH http://localhost:5000/api/email/recall/:id

# 6. Forgot password (no SMTP needed in dev)
POST /api/auth/forgot-password  { "email": "user1@test.com" }
# → response includes _devOTP when SMTP not configured
POST /api/auth/verify-otp       { "email": "user1@test.com", "otp": "<devOTP>" }
POST /api/auth/reset-password   { "resetToken": "...", "newPassword": "newpass123" }

# 7. Upload avatar
POST http://localhost:5000/api/profile/avatar
Authorization: Bearer <token>
Body: form-data → avatar: [image file]
```

---

## ⚠️ Common Errors & Fixes

| Error | Fix |
|---|---|
| `ECONNREFUSED` MongoDB | Run `mongod` — MongoDB not started |
| Attachments not uploading | Fixed in `api.js` — `Content-Type` not hardcoded for FormData |
| SMTP auth failed | Use Gmail **App Password**, not real password |
| OTP not in email | Check spam; dev mode returns `_devOTP` in API response |
| 403 on `/admin` | Login as `admin@test.com` — regular users can't access admin |
| ReactQuill blank on load | It lazy-loads — wait 1-2s; normal in dev |
| File download 404 | `uploads/` auto-created on server start; run `node seed.js` |
| Rate limit error (429) | Too many requests — wait 15 min or increase limit in `security.js` |
| Recall button missing | Only appears in Sent view within 2 minutes of sending |
| Trash not emptying after 30 days | Cron runs daily at 2 AM — check server logs |

---

## 🔐 Security Summary

- Passwords: **bcrypt** (10 salt rounds)
- JWT: expires in **7 days** (configurable)
- Rate limiting: **200 req/15 min** general, **20/15 min** for auth
- Reset OTPs: expire in **10 minutes**
- Reset tokens: expire in **15 minutes**  
- Recall window: **2 minutes**
- Trash auto-delete: **30 days**
- HTML sanitized with **DOMPurify** (frontend) + **xss** (backend)
- MongoDB injection protection via **express-mongo-sanitize**
- HTTP security headers via **Helmet**
- File download: **sender/receiver ownership check** + path traversal guard
- SMTP credentials: **server-side only**, never sent to frontend

---

## 🌍 Environment Variables Reference

| Variable | Required | Example | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `MONGO_URI` | Yes | `mongodb://localhost:27017/mailflow` | MongoDB connection |
| `JWT_SECRET` | Yes | `random_string_32chars` | JWT signing key |
| `JWT_EXPIRE` | No | `7d` | Token expiry |
| `CLIENT_URL` | No | `http://localhost:3000` | CORS origin |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | `you@gmail.com` | SMTP username |
| `SMTP_PASS` | No | `apppassword` | Gmail App Password |
| `SMTP_FROM_NAME` | No | `MailFlow` | Email sender name |
