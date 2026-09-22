const fs = require('fs');
const path = require('path');
const {
  IMAGES_DIR,
  VIDEOS_DIR,
  UPLOADED_IMAGES_DIR,
  UPLOADED_VIDEOS_DIR,
  DELETED_DIR,
  MIME_TYPES
} = require('../config/constants');

function ensureDirectoriesExist() {
  const dirs = [
    IMAGES_DIR,
    VIDEOS_DIR,
    UPLOADED_IMAGES_DIR,
    UPLOADED_VIDEOS_DIR,
    DELETED_DIR
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function sanitizeFilename(filename) {
  // Mimic secure_filename: replace unsafe characters, keep alphanumeric, dots, underscores, dashes
  const base = path.basename(filename);
  return base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

module.exports = {
  ensureDirectoriesExist,
  sanitizeFilename,
  getMimeType
};
