const express = require('express');
const DisengagementLetter = require('../controllers/disengagementLetter.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addDisengagementLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  DisengagementLetter.addDisengagementLetter,
);
router.post(
  '/v1/listDisengagementLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  DisengagementLetter.listDisengagementLetter,
);
router.post(
  '/v1/getDisengagementLetterByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  DisengagementLetter.getDisengagementLetterByID,
);
router.post(
  '/v1/updateDisengagementLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  DisengagementLetter.updateDisengagementLetter,
);

router.post(
  '/v1/deleteDisengagementLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DISENGAGEMENTLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  DisengagementLetter.deleteDisengagementLetter,
);
module.exports = router;
