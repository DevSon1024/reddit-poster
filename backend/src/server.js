const express = require('express');
const cors = require('cors');
const { PORT, IMAGES_DIR, VIDEOS_DIR } = require('./config/constants');
const { ensureDirectoriesExist } = require('./utils/fileHelper');

// Controllers & Routes
const accountsRoutes = require('./routes/accountsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const filesRoutes = require('./routes/filesRoutes');
const postsRoutes = require('./routes/postsRoutes');
const postsController = require('./controllers/postsController');
const filesController = require('./controllers/filesController');

// Ensure all data directories exist
ensureDirectoriesExist();

const app = express();

// Global middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static media serving
app.use('/images', express.static(IMAGES_DIR, {
  maxAge: '1h',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

app.use('/videos', express.static(VIDEOS_DIR));

// API routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/posts', postsRoutes);
app.get('/api/flairs', postsController.getFlairs);
app.post('/api/upload', filesController.uploadFiles);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`>> Reddit Poster Node.js backend listening on http://0.0.0.0:${PORT}`);
});
