const express = require('express');
const assetMasterController = require('../controllers/assetMaster.controller');
const router = express.Router();
const {
  uploadImportExcelFile,
  uploadAssetMaster,
} = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadAssetMaster,
  assetMasterController.postAddassetMaster,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  assetMasterController.getassetMasterById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadAssetMaster,
  assetMasterController.updateassetMasterData,
); //update  data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  assetMasterController.deleteassetmaster,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  assetMasterController.poststatuschange,
); //status change
router.post(
  '/v1/bycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  assetMasterController.getAssetMasterbyCompanyId,
); //get by company id
router.post(
  '/v1/getassetcategorybycompid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetMasterController.getAssetCategoriesForSelectedCompany,
); //get asset category by company id

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  assetMasterController.validateUploadExcel,
);

router.post(
  '/v1/revalidateAssetMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetMasterController.revalidateAssetMaster,
);

router.post(
  '/v1/addValidateAssetMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetMasterController.addValidateAssetMaster,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  assetMasterController.generateDemoExcel,
);

module.exports = router;
