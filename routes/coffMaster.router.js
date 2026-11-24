const express = require('express');
const coffMaster = require('../controllers/coffMaster.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getallCoff',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCOMPENSATORYOFF,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.COMPENSATORYOFF,
        operation: formOperation.VIEW,
      },
    ],
  }),
  coffMaster.getAllCoff,
); //get all Coff data
router.post(
  '/v1/deleteCoff',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPENSATORYOFF,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.COMPENSATORYOFF,
        operation: formOperation.DELETE,
      },
    ],
  }),
  coffMaster.postDeleteCoff,
);
router.post(
  '/v1/addCoff',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPENSATORYOFF,
        operation: formOperation.CREATE,
      },
    ],
  }),
  coffMaster.postAddHrLeave,
);

router.post(
  '/v1/addCoffmasterWithAuthorization',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPENSATORYOFF,
        operation: formOperation.CREATE,
      },
    ],
  }),
  coffMaster.addCoffWithAuthorization,
);

module.exports = router;
