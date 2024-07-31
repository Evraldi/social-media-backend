const express = require('express');
const { uploadMedia } = require('../controllers/mediaController');
const multer = require('multer');
const router = express.Router();

const upload = multer({ dest: 'uploads/media' });

router.post('/', upload.single('media'), uploadMedia);

module.exports = router;
