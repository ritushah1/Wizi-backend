const express = require('express');
const router = express.Router();
const empWorkAgreementController = require('../controllers/empWorkAgreement.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addUserWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empWorkAgreementController.addUserWorkAgreement,
);

router.post(
  '/v1/getUserWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empWorkAgreementController.getUserWorkAgreement,
);

router.post(
  '/v1/deleteUserWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  empWorkAgreementController.deleteUserWorkAgreement,
);

router.post(
  '/v1/editUserWorkAgreement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empWorkAgreementController.editUserWorkAgreement,
);

router.post(
  '/v1/getByWorkAgreementID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empWorkAgreementController.getByWorkAgreementID,
);

router.post(
  '/v1/getResponsibilityByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empWorkAgreementController.getResponsibilityByID,
);

router.post('/v1/generateWorkAgreement', empWorkAgreementController.generateWorkAgreement)
router.post('/v1/acceptAgreement', empWorkAgreementController.acceptAgreemnt)
router.post('/v1/deleteAgreement', empWorkAgreementController.deleteAgreement)

module.exports = router;
