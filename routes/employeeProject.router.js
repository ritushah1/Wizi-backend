const express = require('express');
const EmployeeProjectController = require('../controllers/employeeProject.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/assignProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmployeeProjectController.assignProject,
); // save data

router.post(
  '/v1/assignProjectBulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKASSIGNPROJECT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  EmployeeProjectController.assignProjectBulk,
); // add bulk data

router.get(
  '/v1/getEmployeeProjectByuserMasterID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.USERTRANSFERLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeProjectController.getEmployeeProjectByuserMasterID,
); // get data

router.post(
  '/v1/deleteEmployeeProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmployeeProjectController.deleteEmployeeProject,
); //delete by id

router.post(
  '/v1/getEmployeeProjectByCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKASSIGNPROJECT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeProjectController.getEmployeeProjectByCompany,
);
router.post(
  '/v1/getAllEmployeeProject',
  EmployeeProjectController.getAllEmployeeProject,
);

router.put(
  '/v1/updateEmployeeProjectByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmployeeProjectController.updateEmployeeProjectByID,
);

module.exports = router;
