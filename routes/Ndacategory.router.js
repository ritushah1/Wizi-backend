const express = require('express');
const Ndacategorycontroller = require('../controllers/Ndacategory.controller');
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
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.NDA,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Ndacategorycontroller.postAddcategory,
); //save the data
router.post('/v1/getalldata', Ndacategorycontroller.getAllcategoryData); //get the data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Ndacategorycontroller.getcategoryById,
); //get data by id
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  Ndacategorycontroller.postupdateeNdacategoryData,
); //update the data by id
router.get(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  Ndacategorycontroller.postdeletecategory,
); //delete data
router.post('/v1/getbycompanyid', Ndacategorycontroller.getuserCompanyId); //get by company id

router.post(
  '/v1/bycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  Ndacategorycontroller.getbyCompanyId,
); //get by company id
router.post(
  '/v1/uploadexcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  Ndacategorycontroller.uploadexcel,
); //upload excel

router.post(
  '/v1/validateExcel',
  uploadImportExcelFile,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  Ndacategorycontroller.validateUploadExcel,
);

router.post(
  '/v1/reValidateNdaCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  Ndacategorycontroller.reValidateNdaCategory,
);

router.post(
  '/v1/addValidateNdaCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.NDACATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  Ndacategorycontroller.addValidateNdaCategory,
);

module.exports = router;
