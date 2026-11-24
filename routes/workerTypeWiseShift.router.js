const express = require('express');
const router = express.Router();
const workerTypeWiseShiftController = require('../controllers/workerTypeWiseShift.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  workerTypeWiseShiftController.addData,
);
router.get(
  '/v1/getByShift/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workerTypeWiseShiftController.getWorkerTypeByShift,
);
router.delete(
  '/v1/deleteById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHIFT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  workerTypeWiseShiftController.delete,
);

module.exports = router;
