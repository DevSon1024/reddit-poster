const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '../../');

module.exports = {
  PORT: process.env.PORT || 5000,
  BACKEND_ROOT,
  IMAGES_DIR: path.join(BACKEND_ROOT, 'Files', 'Images'),
  VIDEOS_DIR: path.join(BACKEND_ROOT, 'Files', 'Videos'),
  UPLOADED_IMAGES_DIR: path.join(BACKEND_ROOT, 'Uploaded Files', 'Images'),
  UPLOADED_VIDEOS_DIR: path.join(BACKEND_ROOT, 'Uploaded Files', 'Videos'),
  DELETED_DIR: path.join(BACKEND_ROOT, 'deleted_files'),
  CSV_FILE: path.join(BACKEND_ROOT, 'users.csv'),
  ACCOUNTS_FILE: path.join(BACKEND_ROOT, 'accounts.json'),
  ALLOWED_IMAGES: new Set(['.jpg', '.jpeg', '.png', '.webp']),
  ALLOWED_VIDEOS: new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']),
  MIME_TYPES: {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
  }
};
