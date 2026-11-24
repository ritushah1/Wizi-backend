const express = require('express');
const preboardingRequestController = require('../controllers/preboardingrequest.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { uploadResumePreboarding } = require('../middleware/uploadFile');
const router = express.Router();

router.post(
  '/v1/add',
  uploadResumePreboarding,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingRequestController.postAddPreboardingRequest,
); // save data

router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingRequestController.getAllPreboardingRequestData,
); //get all product data

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingRequestController.postUpdatePreboardingRequest,
); //update product data

router.get(
  '/v1/getPreboardingRequestByPreboardingId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingRequestController.getPreboardingRequestByPreboardingId,
); //update product data

router.post(
  '/v1/getPreboardingRequestCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingRequestController.getPreboardingRequestCount,
);

router.post(
  '/v1/getPreboardingRequestListByDate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingRequestController.getPreboardingRequestListByDate,
);
module.exports = router;
