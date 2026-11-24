const express = require('express');
const notificationPolicy = require('../controllers/notificationPolicy.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILSETUP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  notificationPolicy.postAddNotificationPolicy,
); //save the data
router.get(
  '/v1/getNotificationPolicyDataByCompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILSETUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  notificationPolicy.getNotificationPolicyDataByCompanyId,
); //get by id

router.post(
  '/v1/TestEmail',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MAILSETUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  notificationPolicy.TestEmail,
); //save the data

module.exports = router;
