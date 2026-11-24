const express = require('express');
const hrLeavesMonthlyTransController = require('../controllers/hrLeavesMonthlyTrans.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/updateTrans',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.postUpdateLeaveAttnTranId,
);

router.post(
  '/v1/attendanceCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.attendanceCalculation,
);

// Streaming endpoint for attendance calculation with real-time progress
router.post(
  '/v1/attendanceCalculation/stream',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.attendanceCalculationStream,
);

router.post(
  '/v1/verifyAllAttendanceCalcution',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.verifyAllAttendanceCalcution,
); // verfify all data
router.post(
  '/v1/unVerifyAllAttendanceCalcution',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.unVerifyAllAttendanceCalcution,
); // unverify all data
router.post(
  '/v1/attendanceSummarybyuserid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYATTENDANCESUMMARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.attendanceSummarybyuserid,
);

router.post(
  '/v1/demoCountWiseAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.demoCountWiseAttendance,
);
router.post(
  '/v1/uploadCountWiseAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  hrLeavesMonthlyTransController.uploadCountWiseAttendance,
);

// -------------------------Monthly Attendance Entry -------------------------

router.post(
  '/v1/listMonthlyAttendanceEntry',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYATTENDANCEENTRY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.listMonthlyAttendanceEntry,
);

router.post(
  '/v1/saveMonthlyAttendanceEntry',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYATTENDANCEENTRY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrLeavesMonthlyTransController.saveMonthlyAttendanceEntry,
);

router.post(
  '/v1/deleteMonthlyAttendanceEntry',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYATTENDANCEENTRY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  hrLeavesMonthlyTransController.deleteMonthlyAttendanceEntry,
);

router.post(
  '/v1/getPendingCountsForAttendanceAndSalaryCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeavesMonthlyTransController.getPendingCountsForAttendanceAndSalaryCalculation,
);

module.exports = router;
