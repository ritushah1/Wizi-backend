const express = require('express');
const WorkingLocation = require('../controllers/workingLocation.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  WorkingLocation.postAddWorkingLocation,
); // save data\
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  WorkingLocation.getWorkingLocationById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  WorkingLocation.postUpdateWokingLocation,
);

router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  WorkingLocation.poststatuschange,
); //delete by id

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  WorkingLocation.postDeleteWorkingLocationById,
);
router.post(
  '/v1/getworkinglocationReports',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  WorkingLocation.getWorkingLocationReports,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  WorkingLocation.validateUploadExcel,
);

router.post(
  '/v1/revalidateWorkingLocation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  WorkingLocation.revalidateWorkingLocation,
);

router.post(
  '/v1/addValidateWorkingLocation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  WorkingLocation.addValidateWorkingLocation,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGLOCATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  WorkingLocation.generateDemoExcel,
);
module.exports = router;
