const express = require('express');
const FileMigrationScriptController = require('../controllers/fileMigrationScript.controller');
const router = express.Router();

router.post(
  '/v1/attendanceLogsToS3',
  FileMigrationScriptController.migrateAttendanceLogsToS3,
);
router.post(
  '/v1/biometricLogsToS3',
  FileMigrationScriptController.migrateBiometricLogsToS3,
);
router.post(
  '/v1/canteenLogsToS3',
  FileMigrationScriptController.migrateCanteenLogsToS3,
);
router.post(
  '/v1/expenseAttachmentToS3',
  FileMigrationScriptController.migrateExpenseAttachmentToS3,
);
router.post(
  '/v1/vehicleMeterToS3',
  FileMigrationScriptController.migrateVehicleMeterToS3,
);
router.post(
  '/v1/migrateSalarySlipToS3',
  FileMigrationScriptController.migrateSalarySlipToS3,
);
router.post(
  '/v1/taskAttachmentToS3',
  FileMigrationScriptController.migrateTaskAttachmentToS3,
);

router.post(
  '/v1/employeeNdaToS3',
  FileMigrationScriptController.migrateEmployeeNDAToS3,
);

router.post(
  '/v1/taskRemarkAttachmentToS3',
  FileMigrationScriptController.migrateTaskRemarkAttachmentToS3,
);
module.exports = router;
