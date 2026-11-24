const express = require('express');
const ProjectController = require('../controllers/project.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ProjectController.addProject,
);

router.post(
  '/v1/listProjects',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ProjectController.listProjects,
);

router.get(
  '/v1/getProjectByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ProjectController.getProjectByID,
);

router.post(
  '/v1/updateProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ProjectController.updateProject,
);

router.post(
  '/v1/deleteProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ProjectController.deleteProject,
);

router.post(
  '/v1/updateProjectStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ProjectController.updateProjectStatus,
);

router.post(
  '/v1/demoProjectExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ProjectController.demoProjectExcel,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  ProjectController.validateUploadExcel,
);

router.post(
  '/v1/revalidateProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ProjectController.revalidateProject,
);

router.post(
  '/v1/addValidateProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ProjectController.addValidateProject,
);
router.get(
  '/v1/syncProject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTMASTER,
        operation: formOperation.SYNC,
      },
    ],
  }),
  ProjectController.syncProject,
);
module.exports = router;
