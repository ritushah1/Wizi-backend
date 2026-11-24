const express = require('express');
const OfferLetterController = require('../controllers/offerLetter.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  OfferLetterController.addOfferLetter,
);
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  OfferLetterController.updateOfferLetter,
);
router.post('/v1/delete', OfferLetterController.deleteOfferLetter);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  OfferLetterController.getOfferLetter,
);

module.exports = router;
