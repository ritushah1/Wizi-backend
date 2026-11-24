const express = require('express');
const userShortLeave = require('../controllers/userShortLeave.controller');
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
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BULKSHORTLEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userShortLeave.add,
);
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userShortLeave.update,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  userShortLeave.delete,
);

router.post(
  '/v1/listDataByUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userShortLeave.listDataByUser,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userShortLeave.getById,
);

module.exports = router;
