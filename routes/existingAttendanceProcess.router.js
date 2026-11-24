const express = require('express');
const router = express.Router();
const existingAttendanceProcess = require('../controllers/existingAttendanceProcess.controller');

router.post('/v1/addExistingAttendanceProcess', existingAttendanceProcess.addExistingAttendanceProcess);
router.post(
  '/v1/getAllExistingAttendanceProcess',
  existingAttendanceProcess.getAllExistingAttendanceProcess,
);
router.get(
  '/v1/getExistingAttendanceProcessById/:id',
  existingAttendanceProcess.getExistingAttendanceProcessById,
);
router.post(
  '/v1/updateExistingAttendanceProcess',
  existingAttendanceProcess.updateExistingAttendanceProcess,
);
router.post(
  '/v1/deleteExistingAttendanceProcess',
  existingAttendanceProcess.deleteExistingAttendanceProcess,
);
router.post(
  '/v1/getAllActiveExistingAttendanceProcess',
  existingAttendanceProcess.getAllActiveExistingAttendanceProcess,
);
module.exports = router;
