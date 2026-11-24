const express = require('express');
const employeeJoiningRequestcontroller = require('../controllers/employeeJoiningRequest.controller');
const router = express.Router();
const {
  uploadEmployeeJoiningRequestDocumentFiles,
} = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addemployeeJoiningRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadEmployeeJoiningRequestDocumentFiles,
  employeeJoiningRequestcontroller.addemployeeJoiningRequest,
);

router.get(
  '/v1/getallemployeeJoiningRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeJoiningRequestcontroller.getallEmployeeJoiningRequest,
);

router.get(
  '/v1/getEmployeeJoiningRequestById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeJoiningRequestcontroller.getEmployeeJoiningRequestById,
);

router.post(
  '/v1/editAllEmployeeJoiningRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadEmployeeJoiningRequestDocumentFiles,
  employeeJoiningRequestcontroller.editAllEmployeeJoiningRequest,
);

router.post(
  '/v1/editStatusEmployeeJoiningRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeJoiningRequestcontroller.editStatusEmployeeJoiningRequest,
);
router.post(
  '/v1/removeImages',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeJoiningRequestcontroller.removeImages,
);

router.get(
  '/v1/employeejoiningRequestFormDownload',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeJoiningRequestcontroller.employeejoiningRequestFormDownload,
); //downlaod the form
module.exports = router;
