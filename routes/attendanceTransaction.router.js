const express = require('express');
const attendancetransactionController = require('../controllers/attendancetransaction.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/attendancereport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PUNCHINPUNCHOUTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.attendancereport,
); //Date Wise
router.post(
  '/v1/getovertimeuserwise',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOVERTIME,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.getovertimeuserwise,
);

router.get(
  '/v1/getAttendanceLogsByTrnsactionId/:id',

  attendancetransactionController.getAttendanceLogsByTrnsactionId,
);

router.post(
  '/v1/dashboardpunchinout',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.dashboardpunchinout,
);

router.post(
  '/v1/shiftupdate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTVALIDATE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.shiftupdate,
);

router.get(
  '/v1/dashboardattendanceNEW',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.dashboardattendanceNEW,
);

router.post(
  '/v1/dashboardMisspunchReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MISSPUNCHREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.dashboardMisspunchReport,
);

router.get(
  '/v1/LateComeEarlyGo',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYBYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.LateComeEarlyGoReport,
);

router.get(
  '/v1/getLeaveExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FYWISELEAVEREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.getLeaveExcel,
);

router.post(
  '/v1/getDailyHourlyReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYHOURLYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.getDailyHourlyReport,
);

router.get(
  '/v1/getPerDayCostDepartmentWise',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYCOSTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.getPerDayCostDepartmentWise,
);

router.post(
  '/v1/totalPunchIn',
  attendancetransactionController.totalpunchInCount,
);

router.post('/v1/totalpunchIn1', attendancetransactionController.totalpunchIn);

router.post(
  '/v2/attendancestatus',
  attendancetransactionController.attendancestatus_V2,
);

router.post(
  '/v1/getUserLogDateWise',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendancetransactionController.getUserLogDateWise,
);

router.post(
  '/v1/attendanceTimingReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCETIMINGREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.attendanceTimingReport,
);

router.post(
  '/v1/attendanceTranUser',
  attendancetransactionController.attendanceByCompanyId,
);

// Add manually LCEG Penalty
router.post(
  '/v1/addLCEGPenalty',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PENALTYMANAGEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.addLCEGPenalty,
);

// Remove Manually LCEG Penalty
router.post(
  '/v1/deleteLCEGPenalty',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PENALTYMANAGEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.deleteLCEGPenalty,
);

router.post(
  '/v1/generateExcelForStatusWiseAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.generateExcelForStatusWiseAttendance,
);

router.post(
  '/v1/validateStatusWiseAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  attendancetransactionController.validateStatusWiseAttendance,
);

router.post(
  '/v1/getValidatedAttendanceData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  attendancetransactionController.getValidatedAttendanceData,
);

router.post(
  '/v1/updateValidatedAttendanceRow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  attendancetransactionController.updateValidatedAttendanceRow,
);

router.post(
  '/v1/deleteValidatedAttendanceRow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  attendancetransactionController.deleteValidatedAttendanceRow,
);

router.post(
  '/v1/reValidateStatusWiseAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.reValidateStatusWiseAttendance,
);

router.post(
  '/v1/addStatusWiseAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.addStatusWiseAttendance,
);

router.post(
  '/v1/dailyAttendanceSummary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYATTENDANCESUMMARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.dailyAttendanceSummary,
);

router.post(
  '/v1/genderWiseAttendanceLeaveCalc',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.genderWiseAttendanceLeaveCalc,
);

router.post(
  '/v1/userCompletedWorkingHours',
  attendancetransactionController.userCompletedWorkingHours,
);

router.post(
  '/v1/generateInOutExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.generateInOutExcel,
);

router.post(
  '/v1/validateExcelWithPagination',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  attendancetransactionController.validateAttendanceExcel,
);

router.post(
  '/v1/getValidatedAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.getValidatedAttendance,
);

router.post(
  '/v1/updateAttendanceRow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.updateAttendanceRow,
);

router.post(
  '/v1/deleteAttendanceRow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.deleteAttendanceRow,
);

router.post(
  '/v1/saveInOutAttendanceData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEUPLOAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendancetransactionController.saveInOutAttendanceData,
);

// -------------------------- Api for Mehta Hitech -------------------------

router.post(
  '/v1/add-ot-request',
  attendancetransactionController.add_ot_request,
);

router.post('/v1/add-auto-punchout-data',attendancetransactionController.addAutoPunchOut);
router.post('/v1/getJobById',attendancetransactionController.getJobById);
router.post('/v1/getJobList',attendancetransactionController.getJobList)


module.exports = router;
