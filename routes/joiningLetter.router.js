const express = require('express');
const joiningLetterController = require('../controllers/joiningLetter.controller');
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
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  joiningLetterController.addJoiningLetter,
);
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  joiningLetterController.updateJoiningLetter,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  joiningLetterController.deleteJoiningLetter,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.JOININGLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  joiningLetterController.getJoiningLetter,
);

module.exports = router;
