const express = require('express');
const router = express.Router();
const ShiftRosterController = require('../controllers/shiftRoster.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addShiftRoster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ShiftRosterController.addShiftRoster,
);

router.post(
  '/v1/updateShiftRoster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ShiftRosterController.updateShiftRoster,
);
router.post(
  '/v1/listShiftRosterData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ShiftRosterController.listShiftRosterData,
);

router.post(
  '/v1/exportDemoShiftRoster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ShiftRosterController.exportDemoShiftRoster,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  ShiftRosterController.validateUploadExcel,
);
router.post(
  '/v1/revalidateShiftRoster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ShiftRosterController.revalidateShiftRoster,
);

router.post(
  '/v1/addValidateShiftRoster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFTROSTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.REPORTEEWISESHIFTROSTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ShiftRosterController.addValidateShiftRoster,
);
module.exports = router;
