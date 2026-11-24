const express = require('express');
const zohoAccountMappingController = require('../controllers/zohoAccountMapping.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/create',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  zohoAccountMappingController.create,
);

router.post(
  '/v1/list',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  zohoAccountMappingController.list,
);

router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ZOHOINTEGRATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  zohoAccountMappingController.remove,
);

module.exports = router;
