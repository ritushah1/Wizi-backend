const express = require('express');
const router = express.Router();
const minWagesMasterController = require('../controllers/minWagesMaster.controller');
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
        permissionName: fromPermissionName.MINIMUMWAGESMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  minWagesMasterController.addData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MINIMUMWAGESMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  minWagesMasterController.getById,
);
router.put(
  '/v1/updateData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MINIMUMWAGESMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  minWagesMasterController.updateData,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MINIMUMWAGESMASTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  minWagesMasterController.delete,
);
router.post(
  '/v1/list',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MINIMUMWAGESMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MINIMUMWAGESMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  minWagesMasterController.list,
);

module.exports = router;
