const express = require('express');
const LmsContent = require('../controllers/lmsContent.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Multer config for content file uploads (temp storage before S3)
const uploadDir = path.join(__dirname, '../uploads/lms-content');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const contentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}_${Math.floor(Math.random() * 1000000)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit
});

// Content file upload routes
router.post(
  '/lessons/:lessonId/upload',
  contentUpload.single('file'),
  LmsContent.uploadContentFile,
);
router.post(
  '/courses/:courseId/cover-image',
  contentUpload.single('file'),
  LmsContent.uploadCourseCover,
);

// Chunked upload routes (for large files)
router.post('/lessons/:lessonId/upload/init', LmsContent.initChunkedUpload);
router.post(
  '/lessons/:lessonId/upload/chunk',
  contentUpload.single('chunk'),
  LmsContent.uploadChunk,
);
router.post(
  '/lessons/:lessonId/upload/complete',
  LmsContent.completeChunkedUpload,
);

// Video / media chunk streaming route (supports HTTP 206 Range requests)
router.get('/stream', LmsContent.streamVideo);
router.post('/stream', LmsContent.streamVideo);

module.exports = router;
