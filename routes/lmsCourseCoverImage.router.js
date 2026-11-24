const express = require('express');
const router = express.Router();
const lmsCourseCoverImageController = require('../controllers/lmsCourseCoverImage.controller');
const { uploadLMSCoverImage } = require('../middleware/uploadFile');

// Upload course cover image
router.post(
  '/upload',
  uploadLMSCoverImage,
  lmsCourseCoverImageController.uploadCourseCoverImage
);

// Delete course cover image
router.post(
  '/delete',
  lmsCourseCoverImageController.deleteCourseCoverImage
);

module.exports = router;
