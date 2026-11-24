const express = require('express');
const hrLeaveTypesController = require('../controllers/hrLeaveTypes.controller');
const router = express.Router();
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVETYPES,
        operation: formOperation.CREATE,
      },
    ],
  }),
  hrLeaveTypesController.postAddHrLeaveTypes,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVETYPES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrLeaveTypesController.getHrLeaveTypesById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVETYPES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrLeaveTypesController.postUpdateHrLeaveTypes,
); //update hr salary fields data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVETYPES,
        operation: formOperation.DELETE,
      },
    ],
  }),
  hrLeaveTypesController.postDeleteHrLeaveTypeById,
); //delete by id
router.post(
  '/v1/addfile',
  uploadImportExcelFile,
  hrLeaveTypesController.postImportData,
); // save data
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVETYPES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  hrLeaveTypesController.poststatuschange,
); //status change
router.post(
  '/v1/getdatabycompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVETYPES,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrLeaveTypesController.getHrLeaveTypesByCompany,
); //HRLeave By Company

router.get(
  '/v1/getDataWithoutOutDuty/:id',
  hrLeaveTypesController.listDataWithoutOutdoorDuty,
);

// ------------------------ don't delete this api ------------------------------

router.post(
  '/v1/addDefaultLeaveTypeInAllCompany',
  hrLeaveTypesController.addDefaultLeaveTypeInAllCompany,
);

// ---------------------------------------------------------------------------------

router.get(
  '/v1/listLeaveTypeForManageLeave/:id',
  hrLeaveTypesController.listLeaveTypeForManageLeave,
);

router.post('/v1/leaveTypesByUser', hrLeaveTypesController.leaveTypesByUser);

module.exports = router;
