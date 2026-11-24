const express = require('express');
const visitPurposeController = require('../controllers/visitpurpose.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitPurposeController.postAddVisitPurpose,
); // save data
router.post('/v1/getalldata', visitPurposeController.getAllVisitPurposeData); //get all visitPurpose data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitPurposeController.getVisitPurposeById,
); //get by id

router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitPurposeController.getVisitPurposeByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitPurposeController.postUpdateVisitPurpose,
); //update visitPurpose data

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  visitPurposeController.postDeleteVisitPurposeById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  visitPurposeController.poststatuschange,
); //status change

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  visitPurposeController.validateUploadExcel,
);

router.post(
  '/v1/reValidateVisitPurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitPurposeController.reValidateVisitPurpose,
);

router.post(
  '/v1/addValidateVisitPurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  visitPurposeController.addValidateVisitPurpose,
);

module.exports = router;
