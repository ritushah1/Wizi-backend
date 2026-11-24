const express = require('express');
const AttendanceApiController = require('../controllers/attendanceApi.controller');
const {
  uploadWebMobileAttendanceAttachment,
} = require('../middleware/uploadFile');
const router = express.Router();

router.post(
  '/v1/webMobileAttendanceApi',
  uploadWebMobileAttendanceAttachment,
  AttendanceApiController.webMobileAttendanceApi,
);

module.exports = router;
