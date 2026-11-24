const express = require('express');
const gradeStructureController = require('../controllers/gradestructure.controller');
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
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  gradeStructureController.postAddGradeStructure,
);

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gradeStructureController.getGradeStructureById,
);

router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gradeStructureController.getGradeStructureByCompanyMasterId,
);

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gradeStructureController.postUpdateGradeStructure,
);

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  gradeStructureController.postDeleteGradeStructureById,
);

router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gradeStructureController.poststatuschange,
);

router.get(
  '/v1/getcompany/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  gradeStructureController.getGradeStructureByCompanyId,
);

router.post(
  '/v1/getptvaluebycompanystate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  gradeStructureController.getptvaluebycompanystate,
);

router.post(
  '/v1/getctcvalue',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gradeStructureController.getctcvalue,
);

router.post(
  '/v1/getctcvalue1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gradeStructureController.getctcvalue1,
);

router.post(
  '/v1/getGradeForAssignStructure',
  gradeStructureController.getGradeForAssignStructure,
);

router.post(
  '/v1/getGradeForAssignStructureByCompany',
  gradeStructureController.getGradeForAssignStructureByCompany,
);

router.post(
  '/v1/exportGradeStructure',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gradeStructureController.exportGradeStructure,
);

module.exports = router;
