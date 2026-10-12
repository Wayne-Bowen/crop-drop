const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { HttpError } = require('./util');

const DIR = path.join(__dirname, '..', 'uploads');
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + (EXT[file.mimetype] || '.bin')),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Photos must be JPG, PNG or WEBP.')),
});

// The browser-supplied type can be faked, so check the real file signature too.
function looksLikeImage(file) {
  const b = Buffer.alloc(12);
  const fd = fs.openSync(file.path, 'r'); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  return jpg || png || webp;
}
function removeUpload(url) {
  if (url && url.startsWith('/uploads/')) fs.unlink(path.join(DIR, path.basename(url)), () => {});
}
module.exports = { upload, looksLikeImage, removeUpload };
