const express = require('express');
const productController = require('../controllers/product.controller');
const router = express.Router();
const {
  uploadProductImage,
  uploadImportExcelFile,
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
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadProductImage,
  productController.postAddProduct,
); // save data

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  productController.getProductById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  productController.getProductByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadProductImage,
  productController.postUpdateProduct,
); //update product data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  productController.postDeleteProductById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  productController.poststatuschange,
); //status change
router.get(
  '/v1/getallbyparent/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  productController.getAllProductByChild_Parent,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  productController.validateUploadExcel,
);

router.post(
  '/v1/reValidateProduct',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  productController.reValidateProduct,
);

router.post(
  '/v1/addValidateProduct',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PRODUCT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  productController.addValidateProduct,
);

module.exports = router;
