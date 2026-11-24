const express = require('express');
const UserTransferLetter = require('../controllers/userTransferLetter.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addUserTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserTransferLetter.addUserTransferLetter,
);
router.post(
  '/v1/getUserTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserTransferLetter.getUserTransferLetter,
);
router.post(
  '/v1/updateUserTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserTransferLetter.updateUserTransferLetter,
);
router.post(
  '/v1/deleteUserTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  UserTransferLetter.deleteUserTransferLetter,
);
router.post(
  '/v1/sendEmailUserTransferLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserTransferLetter.sendEmailUserTransferLetter,
);

module.exports = router;
