const express = require('express');
const userleaveController = require('../controllers/userleave.controller');
const router = express.Router();
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  uploadImportExcelFile,
  uploadUserLeaves,
  uploadUserLeave,
  uploadUserLeavexlsx,
} = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v2/bulk/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadUserLeave,
  checkRolePermission,
  permissionAccess,
  userleaveController.postBulkAddLeave_Web,
); //Bulk Save the data

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  permissionAccess,
  userleaveController.getLeaveById,
); //get data by userleaveappid
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserLeaves,
  permissionAccess,
  userleaveController.updateUserData,
); //update the data by id

router.get(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  permissionAccess,
  userleaveController.deleteUserData,
); //delete data

router.get(
  '/v1/LeavedetailById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  userleaveController.getLeaveByLeaveId,
);


router.get(
  '/v1/lapseLeaveBalance',
  permissionAccess,
  userleaveController.lapseLeaveBalance,
);

router.get(
  '/v1/getUserLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  permissionAccess,
  userleaveController.getUserLeaveBalance,
);

router.get(
  '/v1/getOptionalLeaveByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.LEAVEAUTHREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userleaveController.getOptionalLeaveByUserId,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  userleaveController.validateUploadExcel,
);

router.post(
  '/v1/revalidateManualLeave',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BIOMETRICATTENDANCE,
        operation: formOperation.DOWNLOAD,
      },
    ],
  }),
  userleaveController.revalidateManualLeave,
);

router.post(
  '/v1/addValidateManualLeave',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userleaveController.addValidateManualLeave,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDMANUALLEAVE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userleaveController.generateDemoExcel,
);

router.post(
  '/v1/add_Outdoor_Duty',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ADMINOUTDOORDUTY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userleaveController.addOutdoorDuty,
);

router.put(
  '/v1/update_Outdoor_Duty/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userleaveController.updateOutdoorDuty,
);

router.post(
  '/v1/listOutdoorDutyUserWise',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  userleaveController.listOutdoorDutyUserWise,
);

// ------------------------------ Lapse leave Balance --------------------- companyId and LeaveId wise-------------
router.post(
  '/v1/lapseLeaveBalanceLeaveId',
  userleaveController.lapseLeaveBalanceLeaveId,
);

router.post(
  '/v2/LeaveByUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  userleaveController.getLeaveByUserId_V2,
);

router.get(
  '/v1/getUsedCoffByLeaveId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  userleaveController.getUsedCoffByLeaveId,
);

router.post(
  '/v1/getAllUserLeavesBalanceData',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),

  userleaveController.getAllUserLeavesBalanceData,
);

router.post(
  '/v1/manageLeaveBalance',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userleaveController.manageLeaveBalance,
);

router.post(
  '/v1/downloadDemoExcelImportLeaveBalance',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),

  userleaveController.downloadDemoExcelImportLeaveBalance,
);

router.post(
  '/v1/validateExcelImportLeaveBalance',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),

  uploadUserLeavexlsx,
  userleaveController.validateExcelImportLeaveBalance,
);

router.post(
  '/v1/getValidatedExcelData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userleaveController.getValidatedExcelData,
);

router.post(
  '/v1/removeExcelRowByUUID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userleaveController.removeExcelRowByUUID,
);

router.post(
  '/v1/revalidateExcelImportLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  userleaveController.revalidateExcelImportLeaveBalance,
);

router.post(
  '/v1/saveExcelImportLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  userleaveController.saveExcelImportLeaveBalance,
);

router.post(
  '/v1/updateExcelRowImportLeaveBalance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userleaveController.updateExcelRowImportLeaveBalance,
);

router.post(
  '/v2/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYOUTDOORDUTY,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  permissionAccess,
  userleaveController.deleteUserDataV2,
); //delete data

//----------------------------- kiran motores leave issue api--------------------

router.post(
  '/v1/addMissingLeaveBalance',
  userleaveController.addMissingLeaveBalance,
);

module.exports = router;
