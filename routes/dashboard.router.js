const express = require('express');
const DashboardController = require('../controllers/dashboard.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getDepartmentShiftWiseAttendanceCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.SHIFTANDDEPARTMENTWISEATTENDANCECOUNTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.getDepartmentShiftWiseAttendanceCount,
);

router.post(
  '/v1/attendanceAndTrackingInsights',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEINSIGHTS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.attendanceAndTrackingInsights,
);

router.post(
  '/v1/deparmentWiseDailyAttendanceSummary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DAILYATTENDANCESUMMARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.deparmentWiseDailyAttendanceSummary,
);

// LMS Dashboard Endpoints
router.get(
  '/admin',
  DashboardController.getAdminDashboard,
);

router.get(
  '/trainer',
  DashboardController.getTrainerDashboard,
);

router.get(
  '/trainee',
  DashboardController.getTraineeDashboard,
);

router.post(
  '/v1/branchDepartmentWiseAttendanceCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.branchDepartmentWiseAttendanceCount,
);
router.post(
  '/v1/branchDepartmentWiseAttendanceOnlyCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.branchDepartmentWiseAttendanceOnlyCount,
);
router.post(
  '/v1/branchDepartmentWiseAttendanceDateWiseCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.branchDepartmentWiseAttendanceDateWiseCount,
);
router.post(
  '/v1/branchDesignationWiseEmployeeCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.branchDesignationWiseEmployeeCount,
);
router.post(
  '/v1/employeeAttritionRatio',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.employeeAttritionRatio,
);

router.post(
  '/v1/locationDashboard',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOCATIONDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DashboardController.locationDashboard,
);
module.exports = router;
