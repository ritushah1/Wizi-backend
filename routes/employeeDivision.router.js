const express = require('express');
const employeeDivisionController = require('../controllers/employeeDivision.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
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
  employeeDivisionController.addData,
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
  employeeDivisionController.getByUserId,
); // get data

router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEDIVISION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeDivisionController.addBulk,
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
  employeeDivisionController.getDataBycompanyId,
); // get data

router.get(
  '/v1/getEmployeeDivisionByCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEDIVISION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  employeeDivisionController.getEmployeeDivisionByCompany,
);

router.get(
  '/v1/downloadDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEDIVISION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeDivisionController.downloadDemoExcel,
);
router.post(
  '/v1/uploadDivision',
  uploadImportExcelFile,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEDIVISION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADDBULKEMPLOYEEDIVISION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeDivisionController.uploadDivision,
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
  employeeDivisionController.postDeleteEmployeeDivision,
); //delete by id
module.exports = router;
