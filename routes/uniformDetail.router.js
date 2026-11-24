const express = require('express');
const router = express.Router();
const uniformDetailController = require('../controllers/uniformDetail.controller');
const UniformDetail = require('../models/uniformDetail');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addUniformData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uniformDetailController.addUniformData,
);

router.put(
  '/v1/editUniformData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uniformDetailController.editUniformData,
);

router.get(
  '/v1/getUniformDataByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uniformDetailController.getUniformDataByID,
);

router.get(
  '/v1/getUniformDataByUserMasterID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uniformDetailController.getUniformDataByUserMasterID,
);

router.delete(
  '/v1/deleteUniformData/:uniformDetailID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uniformDetailController.deleteUniformData,
);

module.exports = router;
