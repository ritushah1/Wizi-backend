const express = require('express');
const empDigitalSignatureController = require('../controllers/employeedigitalsignature.controller');
const router = express.Router();
const { uploadUserSignature } = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserSignature,
  empDigitalSignatureController.postAddEmployeeDigitalSignature,
); // save data

router.get(
  '/v1/getbyuserid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empDigitalSignatureController.getEmployeeDigitalSignatureByUserMasterId,
); //get by user id

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserSignature,
  empDigitalSignatureController.postUpdateEmployeeDigitalSignature,
); //update digital signature data

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
  empDigitalSignatureController.postDeleteEmployeeDigitalSignatureById,
); //delete by id

router.post(
  '/v1/bulkDownloadDigitalSignatures',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empDigitalSignatureController.bulkDownloadDigitalSignatures,
);

module.exports = router;
