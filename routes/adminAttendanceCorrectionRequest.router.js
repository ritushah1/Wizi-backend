const express = require('express');
const router = express.Router();
const adminAttendanceCorrectionRequest = require('../controllers/adminAttendanceCorrectionRequest.controller');
const attendanceCorrectionRequest = require('../controllers/attendanceCorrectionRequest.controller');

router.post(
  '/v1/addAttendanceCorrectionReq',
  attendanceCorrectionRequest.addData,
);

router.post(
  '/v1/getAllAttendanceCorrectionReq',
  adminAttendanceCorrectionRequest.getAllAttendanceCorrectionRequest,
);

router.post(
  '/v1/updateAttendanceCorrectionReq',
  attendanceCorrectionRequest.updateData,
);

router.post(
  '/v1/deleteAttendanceCorrectionReq',
  attendanceCorrectionRequest.deleteDataV2,
);

module.exports = router;
