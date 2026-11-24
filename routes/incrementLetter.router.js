const express = require('express');
const IncrementLetter = require('../controllers/incrementLetter.controller');
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
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  IncrementLetter.addIncrementLetter,
);
router.put(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  IncrementLetter.updateIncrementLetter,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  IncrementLetter.deleteIncrementLetter,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.INCREMENTLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  IncrementLetter.getIncrementLetter,
);

module.exports = router;
