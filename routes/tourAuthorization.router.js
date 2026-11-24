const express = require('express');
const router = express.Router();
const tourAuthorizationController = require('../controllers/tourAuthorization.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/viewTourAuthorizationByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOURAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  tourAuthorizationController.viewTourAuthorizationByUserId,
);

router.post(
  '/tourAuthorizationacceptreject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOURAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  tourAuthorizationController.tourAuthorizationacceptreject,
);

router.get(
  '/getTourAuthorizationRequestById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TOUR,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TOURAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  tourAuthorizationController.getTourAuthorizationRequestById,
);

module.exports = router;
