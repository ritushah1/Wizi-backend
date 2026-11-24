const express = require('express');
const employeeAssetController = require('../controllers/assignassettoemp.controller');
const {
  uploadImportExcelFile,
  uploadAssginAsset,
} = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();
router.post(
  '/v1/add',
  uploadAssginAsset,
  employeeAssetController.postAddEmployeeAsset,
); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeAssetController.getAllEmployeeAssetData,
); //get all employee asset data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAssetController.getEmployeeAssetById,
); //get by id

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadAssginAsset,
  employeeAssetController.postUpdateEmployeeAsset,
); //update employee asset data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeAssetController.postDeleteEmployeeAssetById,
); //delete by id
router.post(
  '/v1/deleteAssetImage',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeAssetController.deleteAssetImagesById,
);
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAssetController.poststatuschange,
); //status change
router.post(
  '/v1/return',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeAssetController.returnAsset,
); //status change
router.post(
  '/v1/GetbyAssetCategoryID',
  employeeAssetController.GetbyAssetCategoryID,
); //Get by Asset Category ID
router.get(
  '/v1/getdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeAssetController.Getalldata,
);
router.post(
  '/v1/getbyUserID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYASSETS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeAssetController.getEmployeeAssetDatabyUserID,
); //Get by Asset Category ID

router.post(
  '/v1/uploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  employeeAssetController.uploadExcel,
);
router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSETASIGNEMP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeAssetController.generateDemoExcel,
);

module.exports = router;
