const express = require('express');
const router = express.Router();
const companyNotificationSetupController = require('../controllers/companyNotificationSetup.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NOTIFICATIONSETUP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  companyNotificationSetupController.addData,
);
router.put(
  '/v1/updateData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NOTIFICATIONSETUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyNotificationSetupController.updateData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NOTIFICATIONSETUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  companyNotificationSetupController.getById,
);
router.get(
  '/v1/getlist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NOTIFICATIONSETUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyNotificationSetupController.getlist,
);
router.delete(
  '/v1/deleteById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NOTIFICATIONSETUP,
        operation: formOperation.DELETE,
      },
    ],
  }),
  companyNotificationSetupController.deleteById,
);

module.exports = router;
