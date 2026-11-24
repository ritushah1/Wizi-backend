const express = require('express');
const teamPermissionApiController = require('../controllers/teamPermissionApi.controller');
const router = express.Router();
const manageTeamLeaveController = require('../controllers/userleave.controller');
const { uploadTeamPermissionApi } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/teamDailyAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMDAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  teamPermissionApiController.teamDailyAttendance,
);
router.post(
  '/v1/addTeamManualAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMDAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  teamPermissionApiController.addTeamManualAttendance,
);
router.post(
  '/v1/getTeamUserTrackingInfoById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOCATIONTRACKING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  teamPermissionApiController.getTeamUserTrackingInfoById,
);

router.post(
  '/v1/getTeamUserLeavesBalanceData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  teamPermissionApiController.getAllUserLeavesBalanceData,
);

router.post(
  '/v1/manageTeamLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  manageTeamLeaveController.manageLeaveBalance,
);

router.post(
  '/v1/downloadTeamDemoExcelImportLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  teamPermissionApiController.downloadDemoExcelImportLeaveBalance,
);

router.post(
  '/v1/validateTeamExcelImportLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadTeamPermissionApi,
  teamPermissionApiController.validateExcelImportLeaveBalance,
);

router.post(
  '/v1/saveTeamExcelImportLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  teamPermissionApiController.saveExcelImportLeaveBalance,
);
router.post(
  '/v1/teamVehicleUsage',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  teamPermissionApiController.teamVehicleUsage,
);
module.exports = router;
