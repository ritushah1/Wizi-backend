const express = require('express');
const router = express.Router();
const workAgreementController = require('../controllers/workAgreement.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKAGREEMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  workAgreementController.addWorkAgreement,
);

router.post(
  '/v1/updateworkagreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKAGREEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  workAgreementController.updateWorkAgreement,
);

router.post(
  '/v1/deleteWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKAGREEMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  workAgreementController.deleteWorkAgreement,
);

router.post(
  '/v1/getWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKAGREEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKAGREEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  workAgreementController.getWorkAgreement,
);

module.exports = router;
