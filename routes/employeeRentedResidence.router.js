const express = require('express');
const employeeRentedResidence = require('../controllers/employeeRentedResidence.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  uploadEmployeeRentedResidenceFiles,
} = require('../middleware/uploadFile');

const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYINCOMETAXDECLARATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadEmployeeRentedResidenceFiles,
  employeeRentedResidence.addData,
); // save data
router.get(
  '/v1/getData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeRentedResidence.getData,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYINCOMETAXDECLARATION,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.MYINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeRentedResidence.delete,
);
router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCOMETAXDECLARATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeRentedResidence.listDeclarationRequest,
);
router.post(
  '/v1/acceptReject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCOMETAXDECLARATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeRentedResidence.acceptRejectDeclarationRequest,
);

module.exports = router;
