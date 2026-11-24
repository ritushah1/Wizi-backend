const express = require('express');
const employeeWorkingAreaController = require('../controllers/employeeWorkingArea.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeWorkingAreaController.addData,
); // save data
router.get(
  '/v1/getByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeWorkingAreaController.getByUserId,
); // get data

router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEWORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeWorkingAreaController.addBulk,
); // add bulk data

router.get(
  '/v1/getDataBycompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeWorkingAreaController.getDataBycompanyId,
); // get data

router.get(
  '/v1/getEmployeeWorkingAreaByCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEWORKINGAREA,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  employeeWorkingAreaController.getEmployeeWorkingAreaByCompany,
);

router.get(
  '/v1/downloadDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEWORKINGAREA,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeWorkingAreaController.downloadDemoExcel,
);
router.post(
  '/v1/uploadWorkingArea',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEWORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  employeeWorkingAreaController.uploadWorkingArea,
);
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadImportExcelFile,
  employeeWorkingAreaController.postDeleteEmployeeWorkingArea,
);

module.exports = router;
