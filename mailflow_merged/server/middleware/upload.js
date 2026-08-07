const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

// Auto-create uploads dir
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const ALLOWED = new Set([
  'image/jpeg','image/jpg','image/png','image/gif','image/webp',
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv',
  'application/zip','application/x-zip-compressed','application/octet-stream',
]);

const fileFilter = (req, file, cb) =>
  ALLOWED.has(file.mimetype)
    ? cb(null, true)
    : cb(new Error(`File type "${file.mimetype}" is not allowed`), false);

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
});

// Wrap multer so its errors become proper JSON 400 responses
function wrap(fn) {
  return (req, res, next) =>
    fn(req, res, (err) => {
      if (!err) return next();
      const msg = err instanceof multer.MulterError
        ? ({ LIMIT_FILE_SIZE: 'Files must be under 10 MB', LIMIT_FILE_COUNT: 'Maximum 5 files' }[err.code] || err.message)
        : err.message;
      res.status(400).json({ message: msg });
    });
}

module.exports = {
  array:  (field, max) => wrap(multerInstance.array(field, max)),
  single: (field)      => wrap(multerInstance.single(field)),
  none:   ()           => wrap(multerInstance.none()),
};
