const express = require('express');
const AutoMailSetupController = require('../controllers/autoMailSetup.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTOMAILSETUP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  AutoMailSetupController.addData,
);
router.put(
  '/v1/updateData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTOMAILSETUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AutoMailSetupController.updateData,
);
router.post(
  '/v1/listData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTOMAILSETUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  AutoMailSetupController.listData,
);
router.delete(
  '/v1/deleteData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTOMAILSETUP,
        operation: formOperation.DELETE,
      },
    ],
  }),
  AutoMailSetupController.deleteData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTOMAILSETUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AutoMailSetupController.getById,
);

module.exports = router;
