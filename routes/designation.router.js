const express = require('express');
const designationController = require('../controllers/designation.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationController.postAddDesignation,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  designationController.getDesignationId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  designationController.postUpdateDesignation,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  designationController.postDeleteDesignationById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  designationController.poststatuschange,
); //status by id
router.post(
  '/v1/getDesignationcompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  designationController.getDesignationcompanyid,
); //get by id
router.get(
  '/v1/getDesignationByCompanyId/:id',
  designationController.getDesignationByCompanyId,
); //get by id

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  designationController.validateUploadExcel,
);

router.post(
  '/v1/reValidateDesignation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationController.reValidateDesignation,
);

router.post(
  '/v1/addValidateDesignation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationController.addValidateDesignation,
);

router.get(
  '/v1/designationHierarchy/:companyMasterID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.STRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  designationController.getDesignationHierarchy,
);

router.post(
  '/v1/downloadDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DESIGNATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  designationController.downloadDemoExcel,
);

router.post(
  '/v1/getDesignationBySkillCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEJOININGREQUESTFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  designationController.getDesignationBySkillCategory,
);

module.exports = router;
