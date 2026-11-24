const express = require('express');
const erpIngegrationController = require('../controllers/erpIntegration.controller');
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
        permissionName: fromPermissionName.ERPINTEGRATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  erpIngegrationController.postadd,
);

router.post(
  '/v1/listdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpIngegrationController.listdata,
);

router.put(
  '/v1/editdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPINTEGRATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  erpIngegrationController.editdata,
);

router.delete(
  '/v1/deletedata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPINTEGRATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  erpIngegrationController.deletebyid,
);

router.get(
  '/v1/getdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPINTEGRATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  erpIngegrationController.getById,
);

router.post(
  '/v1/erpHeadName',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  erpIngegrationController.erpHeadName,
);

module.exports = router;
