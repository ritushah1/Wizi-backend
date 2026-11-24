const express = require('express');
const ConfirmationLetter = require('../controllers/confirmationLetter.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addConfirmationLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ConfirmationLetter.addConfirmationLetter,
);
router.post(
  '/v1/listConfirmationLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ConfirmationLetter.listConfirmationLetter,
);
router.post(
  '/v1/getConfirmationLetterByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ConfirmationLetter.getConfirmationLetterByID,
);
router.post(
  '/v1/updateConfirmationLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ConfirmationLetter.updateConfirmationLetter,
);

router.post(
  '/v1/deleteConfirmationLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CONFIRMATIONLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ConfirmationLetter.deleteConfirmationLetter,
);
module.exports = router;
