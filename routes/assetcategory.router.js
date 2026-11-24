const express = require('express');
const assetCategoryController = require('../controllers/assetcategory.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetCategoryController.postAddAssetCategory,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  assetCategoryController.getAssetCategoryById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  assetCategoryController.postUpdateAssetCategory,
); //update asset category data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  assetCategoryController.postDeleteAssetCategoryById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  assetCategoryController.poststatuschange,
); //status by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  assetCategoryController.getAssetCategoryByCompanyId,
); //get by company id
router.get(
  '/v1/getactiveassetcategorybycompanyid/:id',

  assetCategoryController.getactiveassetcategorybycompanyid,
); //get by company id

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  assetCategoryController.validateUploadExcel,
);

router.post(
  '/v1/reValidateAssetCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetCategoryController.reValidateAssetCategory,
);

router.post(
  '/v1/addValidateAssetCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetCategoryController.addValidateAssetCategory,
);

module.exports = router;
