const express = require('express');
const extraDaysController = require('../controllers/extraDays.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/addExtraDays',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXTRADAYS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  extraDaysController.addExtraDays,
);
router.post(
  '/v1/getAllExtraDays',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXTRADAYS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYEXTRADAYS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  extraDaysController.getAllExtraDays,
);

module.exports = router;
