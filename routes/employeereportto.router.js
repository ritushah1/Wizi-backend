const express = require('express');
const employeeReportToController = require('../controllers/employeereportto.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeReportToController.postAddEmployeeReportTo,
); // save data

router.get(
  '/v1/getbyid/:id',
  permissionAccess,
  employeeReportToController.getEmployeeReportToById,
); //get by id

router.post(
  '/v1/updateallreportid',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeReportToController.updateAllReportToID,
);
router.post(
  '/v1/getParentReportingUser',
  permissionAccess,
  employeeReportToController.getParentReportingUser,
);
router.post(
  '/v2/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  permissionAccess,
  employeeReportToController.postAddEmployeeReportToV2,
);
router.post(
  '/v1/delete',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeReportToController.deleteReportTo,
);
router.get(
  '/v2/getbyid/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeReportToController.getEmployeeReportToByIdV2,
);
//get by id
module.exports = router;
