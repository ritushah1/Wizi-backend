const express = require('express');
const depositcategoryController = require('../controllers/depositCategory.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  depositcategoryController.postAddDepositCategory,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  depositcategoryController.getDepositCategoryId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  depositcategoryController.postUpdateDepositCategory,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  depositcategoryController.postDeleteDepositCategoryById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  depositcategoryController.poststatuschange,
); //status by id
router.post(
  '/v1/getDepositCategorycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  depositcategoryController.getDepositCategorycompanyid,
); //get by id
router.get(
  '/v1/getDepositCategoryByCompanyId/:id',
  depositcategoryController.getDepositCategoryByCompanyId,
); //get by id
router.get(
  '/v1/getactivedepartmentbycompanyid/:id',
  depositcategoryController.getactivedepositCategorybycompanyid,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  depositcategoryController.validateUploadExcel,
);

router.post(
  '/v1/reValidateDepositCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  depositcategoryController.reValidateDepositCategory,
);

router.post(
  '/v1/addValidateDepositCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DEPOSITCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  depositcategoryController.addValidateDepositCategory,
);

module.exports = router;
