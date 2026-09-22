const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');

router.get('/pending', postsController.getPendingPosts);
router.post('/upload', postsController.uploadPost);
router.post('/upload_video', postsController.uploadVideoPost);

module.exports = router;
