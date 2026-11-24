const express = require('express');
const employeeAccidentController = require('../controllers/employeeAccident.controller');
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
        permissionName: fromPermissionName.EMPLOYEEACCIDENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeAccidentController.AddEmpAccident,
);
router.post(
  '/v1/getEmpAccidentData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEACCIDENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeAccidentController.getEmpAccidentData,
);
router.get(
  '/v1/getEmpAccidentDataById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEACCIDENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAccidentController.getEmpAccidentDataById,
);
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEACCIDENT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAccidentController.postUpdateEmpAccident,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEACCIDENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeAccidentController.postDeleteEmpAccident,
);

module.exports = router;
