const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');

router.post('/delete', filesController.deleteFile);

module.exports = router;
