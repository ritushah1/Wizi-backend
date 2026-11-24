const express = require('express');
const router = express.Router();
const designationResponsibilityController = require('../controllers/designationResponsibility.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addEditDesignationResponsibilites',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  designationResponsibilityController.addOrEditDesignationResponsibility,
);

router.post(
  '/v1/getResponsibilityByDesignationID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName:fromPermissionName.EMPLOYEEWORKAGREEMENT,
        operation:formOperation.VIEW
      }
    ],
  }),
  designationResponsibilityController.getDesignationResponsibilityByDesignationID,
);

module.exports = router;
