const express = require('express');
const customerController = require('../controllers/customer.controller');
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
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  customerController.postAddCustomer,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  customerController.getCustomerById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  customerController.getCustomerByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  customerController.postUpdateCustomer,
); //update customer data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  customerController.postDeleteCustomerById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  customerController.poststatuschange,
); //status change
router.post(
  '/v1/getalldataoptimized',
  customerController.getAllCustomerDataOptimized,
); //upload

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  customerController.validateUploadExcel,
);

router.post(
  '/v1/revalidateCustomer',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  customerController.revalidateCustomer,
);

router.post(
  '/v1/addValidateCustomer',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  customerController.addValidateCustomer,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  customerController.generateDemoExcel,
);
router.post('/v2/getalldata', customerController.getAllCustomerDataNew);
router.post(
  '/v1/getCustomerByUpdatedAt',
  customerController.getCustomerByUpdatedAt,
);

module.exports = router;
